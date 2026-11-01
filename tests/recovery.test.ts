import { describe, it, expect } from 'vitest'
import { getRecoveryWeek, isPatientAtRisk } from '@/shared/lib/recovery'
import { checkInSchema } from '@/features/patient-checkin/ui/check-in-form'

describe('Recovery week', () => {
  it('clamps to week 1 at start', () => {
    const now = new Date('2026-08-14T12:00:00Z')
    const result = getRecoveryWeek('2026-08-14T00:00:00Z', 8, now)
    expect(result.currentWeek).toBe(1)
    expect(result.weekPct).toBe(13)
  })

  it('does not exceed duration', () => {
    const now = new Date('2026-12-01T12:00:00Z')
    const result = getRecoveryWeek('2026-08-01T00:00:00Z', 8, now)
    expect(result.currentWeek).toBe(8)
    expect(result.weekPct).toBe(100)
  })
})

describe('At-risk flags', () => {
  it('flags high pain', () => {
    expect(isPatientAtRisk({
      painLevel: 9,
      adherenceScore: 80,
      lastCheckInAt: new Date().toISOString(),
      hasActivePlan: true,
    })).toContain('high_pain')
  })

  it('flags low adherence', () => {
    expect(isPatientAtRisk({
      painLevel: 2,
      adherenceScore: 20,
      lastCheckInAt: new Date().toISOString(),
      hasActivePlan: true,
    })).toContain('low_adherence')
  })

  it('flags missing check-in on active plan', () => {
    expect(isPatientAtRisk({
      painLevel: 2,
      adherenceScore: 90,
      lastCheckInAt: null,
      hasActivePlan: true,
    })).toContain('missing_check_in')
  })
})

describe('Check-in schema', () => {
  it('accepts 0-10 scores', () => {
    const result = checkInSchema.safeParse({
      painLevel: 3,
      mobilityLevel: 7,
      confidenceLevel: 8,
      exerciseDifficulty: 4,
    })
    expect(result.success).toBe(true)
  })

  it('rejects scores above 10', () => {
    const result = checkInSchema.safeParse({
      painLevel: 11,
      mobilityLevel: 7,
      confidenceLevel: 8,
      exerciseDifficulty: 4,
    })
    expect(result.success).toBe(false)
  })
})
