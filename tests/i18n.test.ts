import { describe, it, expect } from 'vitest'
import { t, setLocale } from '@/shared/config/i18n'

describe('i18n', () => {
  it('returns Portuguese strings by default', () => {
    setLocale('pt')
    expect(t('auth.login')).toBe('Entrar')
  })

  it('switches to English', () => {
    setLocale('en')
    expect(t('auth.login')).toBe('Sign in')
    setLocale('pt')
  })
})
