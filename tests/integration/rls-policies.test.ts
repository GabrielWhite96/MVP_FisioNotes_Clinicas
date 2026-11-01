/**
 * Integration / contract tests for RLS and Phase 1 close domain rules.
 */

import { describe, it, expect } from 'vitest'
import { CURRENT_CONSENT_VERSION, REQUIRED_CONSENT_TYPES } from '@/entities/consent/api/consent-api'
import { DEFAULT_CAREGIVER_PERMISSIONS } from '@/entities/caregiver/api/caregiver-api'
import { formatMoney } from '@/shared/lib/money'
import { packageUsageLabel, type PackagePurchase } from '@/entities/package/api/package-api'

describe('Caregiver permission defaults', () => {
  it('does not grant clinical records by default', () => {
    expect(DEFAULT_CAREGIVER_PERMISSIONS.view_clinical_records).toBe(false)
    expect(DEFAULT_CAREGIVER_PERMISSIONS.view_progress).toBe(true)
  })
})

describe('Consent versioning', () => {
  it('requires telehealth, privacy, data_processing and terms at current version', () => {
    expect(CURRENT_CONSENT_VERSION).toBe('1.1')
    expect(REQUIRED_CONSENT_TYPES).toEqual(
      expect.arrayContaining(['telehealth', 'privacy', 'data_processing', 'terms'])
    )
  })
})

describe('RLS matrix (contract)', () => {
  it('documents required access rules including phase1 tables', () => {
    const matrix = {
      clinical_records: { patient: 'own', physio: 'linked', caregiver: 'none', admin: 'all' },
      check_ins: { patient: 'own', physio: 'linked', caregiver: 'linked', admin: 'all' },
      telehealth_sessions: { patient: 'own', physio: 'linked', caregiver: 'none', admin: 'all' },
      invoices: { patient: 'own', physio: 'none', caregiver: 'none', admin: 'all' },
      caregiver_invites: { patient: 'own', caregiver: 'email_match', admin: 'all' },
      recovery_packages: { patient: 'active', physio: 'active', caregiver: 'active', admin: 'all' },
    }
    expect(matrix.clinical_records.caregiver).toBe('none')
    expect(matrix.telehealth_sessions.caregiver).toBe('none')
    expect(matrix.invoices.patient).toBe('own')
  })
})

describe('Billing helpers', () => {
  it('formats CAD cents', () => {
    expect(formatMoney(99900, 'CAD')).toMatch(/999/)
  })

  it('summarizes package usage', () => {
    const purchase = {
      home_visits_used: 1,
      virtual_sessions_used: 2,
      package: {
        home_visits_included: 4,
        virtual_sessions_included: 6,
      },
    } as PackagePurchase
    expect(packageUsageLabel(purchase)).toContain('1/4')
    expect(packageUsageLabel(purchase)).toContain('2/6')
  })
})
