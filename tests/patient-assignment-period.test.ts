import { describe, expect, it } from 'vitest'
import {
  assignmentOverlapsPeriod,
  daysAgoIso,
  filterAssignmentsByPeriod,
  todayIso,
} from '@/entities/patient-assignment/model/period'

describe('assignment period overlap', () => {
  it('keeps an open assignment that started before the window', () => {
    expect(assignmentOverlapsPeriod(
      { startedOn: '2026-01-10', endedOn: null },
      '2026-03-01',
      '2026-03-31',
    )).toBe(true)
  })

  it('excludes an assignment that ended before the window', () => {
    expect(assignmentOverlapsPeriod(
      { startedOn: '2026-01-01', endedOn: '2026-02-10' },
      '2026-03-01',
      '2026-03-31',
    )).toBe(false)
  })

  it('excludes an assignment that starts after the window', () => {
    expect(assignmentOverlapsPeriod(
      { startedOn: '2026-04-01', endedOn: null },
      '2026-03-01',
      '2026-03-31',
    )).toBe(false)
  })

  it('includes a same-day transfer as overlapping both periods', () => {
    expect(assignmentOverlapsPeriod(
      { startedOn: '2026-03-15', endedOn: '2026-03-15' },
      '2026-03-01',
      '2026-03-31',
    )).toBe(true)
  })

  it('allows reopening the same professional in a later period', () => {
    const rows = filterAssignmentsByPeriod(
      [
        { startedOn: '2026-01-01', endedOn: '2026-02-01', name: 'Ana' },
        { startedOn: '2026-04-01', endedOn: null, name: 'Ana' },
      ],
      '2026-03-01',
      '2026-04-30',
    )
    expect(rows).toEqual([
      { startedOn: '2026-04-01', endedOn: null, name: 'Ana' },
    ])
  })

  it('returns all rows when the period is open-ended', () => {
    const rows = [
      { startedOn: '2025-01-01', endedOn: '2025-06-01' },
      { startedOn: '2026-01-01', endedOn: null },
    ]
    expect(filterAssignmentsByPeriod(rows, null, null)).toHaveLength(2)
  })

  it('builds ISO day helpers', () => {
    expect(todayIso(new Date('2026-10-31T15:00:00.000Z'))).toBe('2026-10-31')
    expect(daysAgoIso(30, new Date('2026-10-31T15:00:00.000Z'))).toBe('2026-10-01')
  })
})
