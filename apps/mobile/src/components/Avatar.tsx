import { Image, View } from 'react-native';
import { Text } from './Text';
import { AVATAR_PX, avatarRingClass, type AvatarSize, type PartnerRole } from '../theme/variants';

export interface AvatarProps {
  /** Remote image URI; falls back to initials when absent. */
  uri?: string;
  /** Display name — used for initials and the accessibility label. */
  name: string;
  size?: AvatarSize;
  /** Partner identity ring: A = coral initiator, B = gold joiner. */
  partner?: PartnerRole;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Circular avatar primitive (UX-DR7) with optional partner-identity ring. */
export function Avatar({ uri, name, size = 'md', partner }: AvatarProps) {
  const px = AVATAR_PX[size];
  const ring = avatarRingClass(partner);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name} avatar`}
      className={`overflow-hidden rounded-full bg-surface-raised items-center justify-center ${ring}`}
      style={{ width: px, height: px }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: px, height: px }} accessibilityIgnoresInvertColors />
      ) : (
        <Text variant={size === 'sm' ? 'small' : 'h3'}>{initials(name)}</Text>
      )}
    </View>
  );
}
