import type { ReactNode } from 'react';
import { View, ScrollView, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenContainerProps extends ViewProps {
  children: ReactNode;
  /** Remove default screen padding (e.g. for full-bleed driving mode). */
  bleed?: boolean;
  /** Wrap content in a vertical ScrollView — for screens whose content can exceed the viewport
   *  (many buttons/cards) so nothing gets cut off on smaller phones. */
  scroll?: boolean;
}

/**
 * Top-level screen primitive (UX-DR7): warm-dusk base background, safe-area insets, and the
 * spacious screen-level padding (2xl) the design calls for. Pass `scroll` when content may exceed
 * the screen height; the `grow` wrapper keeps `justify-center` layouts centered on tall screens
 * while still scrolling on short ones.
 */
export function ScreenContainer({ children, bleed = false, scroll = false, className, ...rest }: ScreenContainerProps) {
  const inner = `${bleed ? '' : 'px-2xl py-xl'} ${className ?? ''}`.trim();

  if (scroll) {
    return (
      <SafeAreaView className="flex-1 bg-base">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className={`grow ${inner}`} {...rest}>
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base">
      <View className={`flex-1 ${inner}`} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}
