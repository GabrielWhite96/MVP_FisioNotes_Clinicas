import { describe, it, expect } from 'vitest'
import { formatMoney, centsToUnits } from '@/shared/lib/money'
import { formatInTimeZone, DEFAULT_TZ } from '@/shared/lib/dates'

describe('money helpers', () => {
  it('converts cents to units', () => {
    expect(centsToUnits(99900)).toBe(999)
  })

  it('formats currency without hardcoding symbol logic in UI', () => {
    const value = formatMoney(1500, 'CAD', 'en-CA')
    expect(value).toContain('15')
  })
})

describe('timezone helpers', () => {
  it('formats UTC instant in Edmonton timezone', () => {
    const formatted = formatInTimeZone('2026-01-15T18:00:00.000Z', DEFAULT_TZ)
    expect(formatted.length).toBeGreaterThan(0)
  })
})
