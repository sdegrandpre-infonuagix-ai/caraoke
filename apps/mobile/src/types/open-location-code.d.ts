// The `open-location-code` package (Google Plus Codes) ships no TypeScript types.
// Declare the minimal surface Caraoke uses to encode a coarse Plus Code (Story 5.3, FR29).
declare module 'open-location-code' {
  export class OpenLocationCode {
    /** Encode a lat/lng into a Plus Code of the given length (default 10). */
    encode(latitude: number, longitude: number, codeLength?: number): string;
    /** Decode a Plus Code into its bounding area + center. */
    decode(code: string): {
      latitudeLo: number;
      longitudeLo: number;
      latitudeHi: number;
      longitudeHi: number;
      latitudeCenter: number;
      longitudeCenter: number;
      codeLength: number;
    };
    /** Whether the string is a valid full or short Plus Code. */
    isValid(code: string): boolean;
  }
}
