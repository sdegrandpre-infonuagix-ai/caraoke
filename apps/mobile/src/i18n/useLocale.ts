import { useCallback } from 'react';
import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isRtlLanguage } from '@caraoke/shared';
import i18n from './index';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../stores/useAuthStore';
import type { Me } from '../api/useMe';

/**
 * Apply a language locally: switch i18next and align the layout direction (UX-DR13). RTL is
 * applied via I18nManager; since most layout uses logical start/end props, the change is
 * largely immediate (a full RTL flip of native views needs a reload, surfaced by the caller).
 */
export function applyLanguage(code: string): void {
  void i18n.changeLanguage(code);
  const shouldRtl = isRtlLanguage(code);
  if (I18nManager.isRTL !== shouldRtl) {
    I18nManager.allowRTL(shouldRtl);
    I18nManager.forceRTL(shouldRtl);
  }
}

/** Language preference hook: current code + a setter that persists to the profile (FR3). */
export function useLocale() {
  const { i18n: instance } = useTranslation();
  const idToken = useAuthStore((s) => s.idToken);
  const queryClient = useQueryClient();

  const setLanguage = useMutation({
    mutationFn: async (code: string) => {
      applyLanguage(code);
      if (idToken) {
        return apiFetch<Me>('/me', { method: 'PATCH', token: idToken, body: { languagePref: code } });
      }
      return null;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const change = useCallback((code: string) => setLanguage.mutate(code), [setLanguage]);

  return { current: instance.language, change, pending: setLanguage.isPending };
}
