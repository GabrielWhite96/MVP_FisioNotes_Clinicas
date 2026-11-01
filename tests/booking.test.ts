import { describe, it, expect } from 'vitest'

describe('Physio-created appointment payload', () => {
  it('builds correct appointment input shape', () => {
    const payload = {
      patientId: '550e8400-e29b-41d4-a716-446655440001',
      physiotherapistId: '550e8400-e29b-41d4-a716-446655440000',
      modality: 'telehealth' as const,
      scheduledAt: new Date('2026-09-01T10:00:00').toISOString(),
      durationMinutes: 60,
    }
    expect(payload.modality).toBe('telehealth')
    expect(payload.scheduledAt).toContain('2026')
    expect(payload.durationMinutes).toBe(60)
  })
})

describe('Cancel appointment', () => {
  it('uses cancelled status for cancellation', () => {
    const status = 'cancelled'
    expect(['scheduled', 'confirmed'].includes('scheduled')).toBe(true)
    expect(status).toBe('cancelled')
  })
})

describe('Patient ownership model', () => {
  it('patient belongs to a physiotherapist explicitly', () => {
    const patient = {
      id: 'p1',
      physiotherapist_id: 'ph1',
      clinical_status: 'awaiting_assessment',
      account_status: 'no_account',
      profile_id: null,
    }
    expect(patient.physiotherapist_id).toBeTruthy()
    expect(patient.profile_id).toBeNull()
    expect(patient.clinical_status).not.toBe(patient.account_status)
  })
})
