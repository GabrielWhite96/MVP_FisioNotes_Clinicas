import { WEEKDAY_SHORT } from '@/entities/appointment/model/bulk-schedule'

export type AttendanceSession = {
  id: string
  scheduledAt: string
  durationMinutes: number
  status: string
  groupId: string
  groupName: string
}

export type AttendanceGroup = {
  id: string
  name: string
  firstAt: string
  lastAt: string
  weekdays: number[]
  weekdayLabel: string
  times: string[]
  timesLabel: string
  sessionCount: number
  sessions: AttendanceSession[]
}

export function localDateIsoFromInstant(iso: string): string {
  const date = new Date(iso)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localWeekdayFromInstant(iso: string): number {
  return new Date(iso).getDay()
}

export function localTimeHmFromInstant(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function filterSessionsByPeriod(
  sessions: AttendanceSession[],
  from: string | null,
  to: string | null,
): AttendanceSession[] {
  return sessions.filter((session) => {
    const day = localDateIsoFromInstant(session.scheduledAt)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })
}

export function groupAttendanceByParty(sessions: AttendanceSession[]): AttendanceGroup[] {
  const grouped = new Map<string, AttendanceSession[]>()
  for (const session of sessions) {
    const list = grouped.get(session.groupId) ?? []
    list.push(session)
    grouped.set(session.groupId, list)
  }

  return [...grouped.entries()]
    .map(([id, items]) => {
      const sorted = [...items].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      const weekdays = [...new Set(sorted.map((item) => localWeekdayFromInstant(item.scheduledAt)))].sort(
        (a, b) => a - b,
      )
      const times = [...new Set(sorted.map((item) => localTimeHmFromInstant(item.scheduledAt)))].sort()
      return {
        id,
        name: sorted[0]?.groupName ?? '—',
        firstAt: sorted[0]?.scheduledAt ?? '',
        lastAt: sorted[sorted.length - 1]?.scheduledAt ?? '',
        weekdays,
        weekdayLabel: weekdays.map((day) => WEEKDAY_SHORT[day]).join(', '),
        times,
        timesLabel: times.join(', '),
        sessionCount: sorted.length,
        sessions: sorted,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function formatWeekdayList(weekdays: number[]): string {
  return weekdays.map((day) => WEEKDAY_SHORT[day]).join(', ')
}
