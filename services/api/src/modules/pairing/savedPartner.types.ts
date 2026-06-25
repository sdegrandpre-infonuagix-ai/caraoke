/** A saved-partner link row. */
export interface SavedPartner {
  userId: string;
  partnerUserId: string;
  createdAt: string;
}

/** Saved partner enriched with the partner's display info (for the re-pair list). */
export interface SavedPartnerView {
  partnerUserId: string;
  displayName: string | null;
  languagePref: string;
  savedAt: string;
}
