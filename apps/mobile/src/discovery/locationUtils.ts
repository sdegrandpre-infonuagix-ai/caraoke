import { OpenLocationCode } from 'open-location-code';

const olc = new OpenLocationCode();

// A 6-character Plus Code covers a ~0.05° × 0.05° area (~5.5km × 4.5km at mid-latitudes).
// This is coarse enough to never expose precise location (NFR9) while still useful for
// surfacing singers in the same neighbourhood (FR29).
export const COARSE_CODE_LENGTH = 6;

/**
 * Converts a GPS coordinate pair to a coarse Google Plus Code (Open Location Code).
 * Precise coordinates are consumed locally and never transmitted — only the resulting
 * Plus Code leaves the device.
 */
export function toCoarsePlusCode(latitude: number, longitude: number): string {
  return olc.encode(latitude, longitude, COARSE_CODE_LENGTH);
}
