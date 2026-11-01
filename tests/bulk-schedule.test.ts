import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  expandWeeklySchedule,
  findSlotConflicts,
  weekdayOfIsoDate,
} from '@/entities/appointment/model/bulk-schedule'
import {
  filterSessionsByPeriod,
  groupAttendanceByParty,
} from '@/entities/appointment/model/attendance-report'

describe('weekly clinic schedule', () => {
  it('expands selected weekdays into one slot per matching date', () => {
    const slots = expandWeeklySchedule('2026-11-02', '2026-11-13', [
      {
        id: 'series-a',
        clinicPhysiotherapistId: 'physio-1',
        weekdays: [2],
        time: '09:00',
        durationMinutes: 60,
      },
      {
        id: 'series-b',
        clinicPhysiotherapistId: 'physio-2',
        weekdays: [4],
        time: '14:00',
        durationMinutes: 45,
      },
    ])

    expect(weekdayOfIsoDate('2026-11-03')).toBe(2)
    expect(weekdayOfIsoDate('2026-11-05')).toBe(4)
    expect(slots.map((slot) => `${slot.date} ${slot.time} ${slot.clinicPhysiotherapistId}`)).toEqual([
      '2026-11-03 09:00 physio-1',
      '2026-11-05 14:00 physio-2',
      '2026-11-10 09:00 physio-1',
      '2026-11-12 14:00 physio-2',
    ])
  })

  it('detects overlapping times for the same therapist, even with different start times', () => {
    const slots = expandWeeklySchedule('2026-11-03', '2026-11-03', [
      {
        id: 'a',
        clinicPhysiotherapistId: 'physio-1',
        weekdays: [2],
        time: '09:00',
        durationMinutes: 60,
      },
      {
        id: 'b',
        clinicPhysiotherapistId: 'physio-1',
        weekdays: [2],
        time: '09:30',
        durationMinutes: 60,
      },
    ])
    const conflicts = findSlotConflicts(slots)
    expect(conflicts).toHaveLength(2)
    expect(conflicts.every((item) => item.reason === 'batch')).toBe(true)
  })

  it('allows two therapists at the same clock time', () => {
    const slots = expandWeeklySchedule('2026-11-03', '2026-11-03', [
      {
        id: 'a',
        clinicPhysiotherapistId: 'physio-1',
        weekdays: [2],
        time: '09:00',
        durationMinutes: 60,
      },
      {
        id: 'b',
        clinicPhysiotherapistId: 'physio-2',
        weekdays: [2],
        time: '09:00',
        durationMinutes: 60,
      },
    ])
    expect(findSlotConflicts(slots)).toHaveLength(0)
  })

  it('adds days without crossing month boundaries incorrectly', () => {
    expect(addDaysIso('2026-10-31', 1)).toBe('2026-11-01')
  })
})

describe('attendance reports from appointments', () => {
  it('groups a patient history by therapist with days, times and period', () => {
    const groups = groupAttendanceByParty([
      {
        id: '1',
        scheduledAt: '2026-11-03T12:00:00.000Z',
        durationMinutes: 60,
        status: 'scheduled',
        groupId: 'physio-1',
        groupName: 'Ana',
      },
      {
        id: '2',
        scheduledAt: '2026-11-10T12:00:00.000Z',
        durationMinutes: 60,
        status: 'completed',
        groupId: 'physio-1',
        groupName: 'Ana',
      },
      {
        id: '3',
        scheduledAt: '2026-11-05T17:00:00.000Z',
        durationMinutes: 45,
        status: 'scheduled',
        groupId: 'physio-2',
        groupName: 'Bruno',
      },
    ])

    expect(groups.map((group) => group.name)).toEqual(['Ana', 'Bruno'])
    expect(groups[0].sessionCount).toBe(2)
    expect(groups[1].sessionCount).toBe(1)
  })

  it('keeps past sessions when filtering a later window only if they fall inside it', () => {
    const sessions = [
      {
        id: 'old',
        scheduledAt: '2026-01-15T12:00:00.000Z',
        durationMinutes: 60,
        status: 'completed',
        groupId: 'physio-1',
        groupName: 'Ana',
      },
      {
        id: 'recent',
        scheduledAt: '2026-11-03T12:00:00.000Z',
        durationMinutes: 60,
        status: 'scheduled',
        groupId: 'physio-1',
        groupName: 'Ana',
      },
    ]
    expect(filterSessionsByPeriod(sessions, '2026-11-01', '2026-11-30')).toHaveLength(1)
    expect(filterSessionsByPeriod(sessions, null, null)).toHaveLength(2)
  })
})
