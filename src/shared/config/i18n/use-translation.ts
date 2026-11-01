import { useSyncExternalStore } from 'react'
import { getLocale, setLocale, t, type Locale } from '@/shared/config/i18n'

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit() {
  listeners.forEach((l) => l())
}

export function useTranslation() {
  const locale = useSyncExternalStore(subscribe, getLocale, () => 'pt' as Locale)

  return {
    locale,
    t,
    setLocale: (next: Locale) => {
      setLocale(next)
      if (typeof document !== 'undefined') {
        document.documentElement.lang = next === 'en' ? 'en-CA' : 'pt-BR'
      }
      emit()
    },
  }
}
