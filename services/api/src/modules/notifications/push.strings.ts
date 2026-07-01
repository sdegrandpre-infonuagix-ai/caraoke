import type { NotificationType } from './notifier.js';

interface Localized {
  title: string;
  body: string;
}

// Notification copy per language (FR11/NFR19). English is the fallback for any unsupported
// language; more languages are added here over time (the full 25-language set ships with the
// agent's localization). Kept server-side so pushes are localized to the recipient.
const STRINGS: Record<string, Record<NotificationType, Localized>> = {
  en: {
    invite: { title: 'Sing with Caraoke', body: 'A partner wants to sing with you. Tap to join.' },
    'partner.ready': { title: 'Your partner is ready', body: 'Tap to get ready to sing together.' },
    'session.reconnecting': { title: 'Reconnecting…', body: 'Hang tight — reconnecting your duet.' },
  },
  fr: {
    invite: { title: 'Chantez avec Caraoke', body: 'Un partenaire veut chanter avec vous. Touchez pour rejoindre.' },
    'partner.ready': { title: 'Votre partenaire est prêt', body: 'Touchez pour vous préparer à chanter.' },
    'session.reconnecting': { title: 'Reconnexion…', body: 'Un instant — reconnexion de votre duo.' },
  },
  ar: {
    invite: { title: 'غنّ مع كاراوكي', body: 'شريك يريد الغناء معك. اضغط للانضمام.' },
    'partner.ready': { title: 'شريكك جاهز', body: 'اضغط لتستعد للغناء معًا.' },
    'session.reconnecting': { title: 'إعادة الاتصال…', body: 'لحظة — يُعاد الاتصال بثنائيّتك.' },
  },
};

/** Localize a notification to the recipient's language, falling back to English. */
export function localizeNotification(type: NotificationType, language: string): Localized {
  const base = language.split('-')[0] ?? 'en';
  const table = STRINGS[base] ?? STRINGS.en!;
  return table[type];
}
