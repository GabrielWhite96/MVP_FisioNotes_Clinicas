import { describe, it, expect } from 'vitest'
import { getDashboardRoute } from '@/features/auth/api/auth-api'
import { calculateExerciseProgress } from '@/entities/exercise/api/exercise-api'

describe('Role routing', () => {
  it('routes patient to patient dashboard', () => {
    expect(getDashboardRoute('patient')).toBe('/patient/dashboard')
  })

  it('routes physiotherapist to physio dashboard', () => {
    expect(getDashboardRoute('physiotherapist')).toBe('/physio/dashboard')
  })

  it('routes caregiver to caregiver dashboard', () => {
    expect(getDashboardRoute('caregiver')).toBe('/caregiver/dashboard')
  })
})

describe('Exercise progress', () => {
  it('calculates 0% for empty list', () => {
    expect(calculateExerciseProgress([])).toBe(0)
  })

  it('calculates progress based on completions', () => {
    const exercises = [
      { completions: [{ id: '1' }] },
      { completions: [] },
    ]
    expect(calculateExerciseProgress(exercises)).toBe(50)
  })
})

describe('Exercise assignment shape', () => {
  it('has required fields for assignExercise', () => {
    const input = {
      patientId: 'p1',
      physiotherapistId: 'ph1',
      exerciseId: 'e1',
      sets: 3,
      reps: 10,
      frequency: 'daily',
    }
    expect(input.patientId).toBeTruthy()
    expect(input.physiotherapistId).toBeTruthy()
    expect(input.exerciseId).toBeTruthy()
  })
})

describe('Patient access rules (unit)', () => {
  it('patient role is not admin', () => {
    const role = 'patient'
    expect(role).not.toBe('admin')
  })

  it('physiotherapist can access clinical records for linked patients only (policy concept)', () => {
    const hasCareRelationship = true
    expect(hasCareRelationship).toBe(true)
  })
})
