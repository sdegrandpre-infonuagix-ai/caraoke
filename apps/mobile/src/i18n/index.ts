// i18n foundation (Story 2.5, FR5/NFR19). Externalized strings initialized once; the initial
// language defaults to the device locale, resolved to a supported code (FR3).
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { resolveLanguage, DEFAULT_LANGUAGE } from '@caraoke/shared';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

// Bundled translations. Untranslated keys fall back to English. Additional locales are added
// here as their JSON is provided; all 25 supported codes are valid preferences regardless.
const resources = {
  en: { translation: en },
  fr: { translation: fr },
  ar: { translation: ar },
} as const;

export function deviceLanguage(): string {
  const tag = getLocales()[0]?.languageTag ?? null;
  return resolveLanguage(tag);
}

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
