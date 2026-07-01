// Pure variant → NativeWind className maps (Story 2.1). No React/RN imports, so the
// primitive styling logic is unit-testable without a native renderer.

export type ButtonVariant = 'primary' | 'secondary' | 'voice' | 'icon';

/** Base classes shared by all buttons — centered content, press feedback, ≥48px target. */
const BUTTON_BASE = 'items-center justify-center active:opacity-80';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // Primary CTA — coral, 56px (UX layout principle 4).
  primary: 'min-h-[56px] px-lg rounded-sm bg-accent',
  // Secondary — outlined surface, 56px.
  secondary: 'min-h-[56px] px-lg rounded-sm border border-accent bg-transparent',
  // Voice — the real primary on session screens: 72px gradient-feel circle.
  voice: 'h-[72px] w-[72px] rounded-full bg-accent',
  // Icon utility — 48px circle.
  icon: 'h-[48px] w-[48px] rounded-full bg-surface',
};

export function buttonClasses(variant: ButtonVariant, disabled = false): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]}${disabled ? ' opacity-40' : ''}`;
}

/** Label color that meets contrast on each variant's background. */
export function buttonLabelColor(variant: ButtonVariant): 'primary' | 'accent' {
  // Dark text on the coral primary; accent text on the outlined secondary.
  return variant === 'secondary' ? 'accent' : 'primary';
}

export type AvatarSize = 'sm' | 'md' | 'lg';
export const AVATAR_PX: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 72 };

export type PartnerRole = 'A' | 'B';
/** Ring color class for partner identity (A = coral initiator, B = gold joiner). */
export function avatarRingClass(role?: PartnerRole): string {
  if (role === 'A') return 'border-2 border-accent';
  if (role === 'B') return 'border-2 border-secondary';
  return 'border-2 border-border';
}

/** Toggle track classes by on/off state. */
export function toggleTrackClass(on: boolean): string {
  return `h-[32px] w-[52px] rounded-full justify-center ${on ? 'bg-accent' : 'bg-border'}`;
}
