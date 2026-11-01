import { describe, it, expect } from 'vitest'
import { canManagePractice, isPhysioHubPath, trialDaysLeft } from '@/entities/physiotherapist/model/subscription-access'
import { SAAS_PLAN } from '@/shared/config/saas-plan'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

describe('canManagePractice', () => {
  it('allows only active subscriptions', () => {
    expect(canManagePractice({ subscription_status: 'active', trial_ends_at: null })).toBe(true)
  })

  it('blocks inactive subscriptions', () => {
    expect(canManagePractice({ subscription_status: 'inactive', trial_ends_at: null })).toBe(false)
  })

  it('blocks trialing without treating it as access', () => {
    expect(
      canManagePractice({
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 86_400_000).toISOString(),
      })
    ).toBe(false)
  })
})

describe('trialDaysLeft', () => {
  it('returns null when there is no trial end', () => {
    expect(trialDaysLeft(null)).toBeNull()
  })
})

describe('SaaS plan offer', () => {
  it('exposes the R$ 29,90 monthly plan', () => {
    expect(SAAS_PLAN.amountLabel).toBe('R$ 29,90')
    expect(SAAS_PLAN.interval).toBe('mês')
  })

  it('has a dedicated subscription route', () => {
    expect(ROUTES.physio.subscription).toBe('/physio/assinatura')
    expect(ROUTES.subscribe).toBe('/assinar')
  })

  it('treats the dashboard as the inactive hub', () => {
    expect(isPhysioHubPath('/physio/dashboard')).toBe(true)
    expect(isPhysioHubPath('/physio/agenda')).toBe(false)
  })

  it('describes the paywall lock in Portuguese', () => {
    expect(pt.saas.locked.toLowerCase()).toContain('assinatura')
    expect(pt.landing.pricingAmountSuffix).toBe('/mês')
  })
})
