import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  /** Use the raised surface for active/selected/modal states. */
  raised?: boolean;
}

/**
 * Card surface primitive (UX-DR7). Elevation is communicated by surface-color stepping
 * (base → surface → surface-raised), not shadows (dark-theme pattern).
 */
export function Card({ raised = false, className, ...rest }: CardProps) {
  const bg = raised ? 'bg-surface-raised' : 'bg-surface';
  return <View className={`${bg} rounded-md p-lg ${className ?? ''}`} {...rest} />;
}
