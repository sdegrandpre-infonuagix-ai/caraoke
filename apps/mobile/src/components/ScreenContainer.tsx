import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenContainerProps extends ViewProps {
  children: ReactNode;
  /** Remove default screen padding (e.g. for full-bleed driving mode). */
  bleed?: boolean;
}

/**
 * Top-level screen primitive (UX-DR7): warm-dusk base background, safe-area insets, and the
 * spacious screen-level padding (2xl) the design calls for.
 */
export function ScreenContainer({ children, bleed = false, className, ...rest }: ScreenContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <View className={`flex-1 ${bleed ? '' : 'px-2xl py-xl'} ${className ?? ''}`} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}
