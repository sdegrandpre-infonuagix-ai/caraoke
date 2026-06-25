import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  isRtlLanguage,
  resolveLanguage,
  languageSchema,
  DEFAULT_LANGUAGE,
} from './languages.js';

describe('supported languages (FR3/NFR19)', () => {
  it('has exactly 25 languages with unique codes', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(25);
    const codes = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));
    expect(codes.size).toBe(25);
  });

  it('flags RTL languages (UX-DR13)', () => {
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('he')).toBe(true);
    expect(isRtlLanguage('en')).toBe(false);
  });

  it('validates membership', () => {
    expect(isSupportedLanguage('fr')).toBe(true);
    expect(isSupportedLanguage('zz')).toBe(false);
  });

  it('resolves device locales to a supported code, defaulting when unknown', () => {
    expect(resolveLanguage('fr-CA')).toBe('fr');
    expect(resolveLanguage('ar_EG')).toBe('ar');
    expect(resolveLanguage('zh-Hans-CN')).toBe('zh');
    expect(resolveLanguage('xx-YY')).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage(null)).toBe(DEFAULT_LANGUAGE);
  });

  it('languageSchema rejects unsupported codes', () => {
    expect(languageSchema.safeParse('en').success).toBe(true);
    expect(languageSchema.safeParse('zz').success).toBe(false);
  });
});
