import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { ScreenContainer, Text } from '../../src/components';
import { completeSpotifyLink } from '../../src/auth/completeSignIn';

/**
 * OAuth return target for Spotify linking (caraoke://spotify/callback). Exchanges the `code`,
 * links the account server-side, then routes back to the Spotify screen where the status query
 * refetches and reflects the connection (Story 2.4).
 */
export default function SpotifyCallback() {
  const params = useLocalSearchParams<{ code?: string; state?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        // No auth tab open — ignore.
      }
      const code = typeof params.code === 'string' ? params.code : undefined;
      const state = typeof params.state === 'string' ? params.state : undefined;

      if (code) {
        const linked = await completeSpotifyLink(code, state).catch(() => false);
        if (linked) await queryClient.invalidateQueries({ queryKey: ['spotify'] });
      }
      if (!cancelled) router.replace('/spotify');
    })();
    return () => {
      cancelled = true;
    };
  }, [params.code, params.state, router, queryClient]);

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <Text color="secondary">{t('spotify.connecting')}</Text>
      </View>
    </ScreenContainer>
  );
}
