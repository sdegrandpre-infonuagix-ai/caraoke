import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { ScreenContainer, Text } from '../../src/components';
import { completeSpotifyLink } from '../../src/auth/completeSignIn';
import { useAuthStore } from '../../src/stores/useAuthStore';

/**
 * OAuth return target for Spotify linking (caraoke://spotify/callback). Exchanges the `code`,
 * links the account server-side, then routes back to the Spotify screen where the status query
 * refetches and reflects the connection (Story 2.4).
 *
 * The deep link can cold-start a fresh process, so we wait for the auth store to hydrate
 * (status leaves 'loading') before exchanging — linkSpotify needs the restored idToken.
 */
export default function SpotifyCallback() {
  const params = useLocalSearchParams<{ code?: string; state?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((s) => s.status);
  const { t } = useTranslation();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || authStatus === 'loading') return; // wait for session hydration
    done.current = true;

    void (async () => {
      try {
        await WebBrowser.dismissBrowser();
      } catch {
        // No auth tab open — ignore.
      }
      const code = typeof params.code === 'string' ? params.code : undefined;
      const state = typeof params.state === 'string' ? params.state : undefined;

      let linked = false;
      if (code && authStatus === 'signedIn') {
        linked = await completeSpotifyLink(code, state).catch(() => false);
        if (linked) await queryClient.invalidateQueries({ queryKey: ['spotify'] });
      }
      // Surface a failed exchange/link instead of silently returning to the Connect button
      // (which reads as an infinite consent loop).
      router.replace(linked ? '/spotify' : { pathname: '/spotify', params: { error: 'link' } });
    })();
  }, [authStatus, params.code, params.state, router, queryClient]);

  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <Text color="secondary">{t('spotify.connecting')}</Text>
      </View>
    </ScreenContainer>
  );
}
