import { dictionaries, type Locale } from './dictionaries'

let currentLocale: Locale = 'pt'

if (typeof window !== 'undefined') {
  const saved = window.localStorage.getItem('telefisio.locale')
  if (saved === 'en' || saved === 'pt') currentLocale = saved
}

export function setLocale(locale: Locale) {
  currentLocale = locale
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('telefisio.locale', locale)
    document.documentElement.lang = locale === 'en' ? 'en-CA' : 'pt-BR'
  }
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(path: string): string {
  const dict = dictionaries[currentLocale] as unknown as Record<string, unknown>
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, dict)
  if (typeof value === 'string') return value
  // Fallback to PT when EN key is missing
  if (currentLocale !== 'pt') {
    const ptDict = dictionaries.pt as unknown as Record<string, unknown>
    const ptValue = path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && key in acc) {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, ptDict)
    if (typeof ptValue === 'string') return ptValue
  }
  return path
}

export { dictionaries }
export type { Locale }
