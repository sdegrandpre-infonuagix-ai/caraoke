import { z } from 'zod';

/** A supported UI + Voice-Agent language (FR3/FR4/FR5, NFR19). */
export interface Language {
  code: string;
  /** English name. */
  name: string;
  /** Endonym (name in the language itself). */
  nativeName: string;
  /** True for right-to-left scripts (UX-DR13). */
  rtl: boolean;
}

/**
 * The 25 supported languages. Covers the major world languages across scripts and includes
 * RTL languages (Arabic, Hebrew, Persian, Urdu) to exercise the mirrored-layout path.
 */
export const SUPPORTED_LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', rtl: false },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', rtl: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', rtl: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
] as const;

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]];

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE = 'en';

const RTL_CODES = new Set(SUPPORTED_LANGUAGES.filter((l) => l.rtl).map((l) => l.code));

export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

export function isRtlLanguage(code: string): boolean {
  return RTL_CODES.has(code);
}

/**
 * Resolve a device locale (e.g. "fr-CA", "ar_EG", "zh-Hans-CN") to a supported language
 * code, falling back to the default when unsupported. Used for the device-locale default.
 */
export function resolveLanguage(locale: string | null | undefined): string {
  if (!locale) return DEFAULT_LANGUAGE;
  const base = locale.toLowerCase().replace('_', '-').split('-')[0] ?? '';
  return isSupportedLanguage(base) ? base : DEFAULT_LANGUAGE;
}

/** Zod schema accepting only supported language codes. */
export const languageSchema = z.enum(LANGUAGE_CODES);
