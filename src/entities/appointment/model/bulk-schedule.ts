import { combineDateAndTime } from '@/shared/lib/dates'

export const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

export type WeeklySeries = {
  id: string
  clinicPhysiotherapistId: string
  weekdays: number[]
  time: string
  durationMinutes: number
}

export type ProposedSlot = {
  date: string
  time: string
  scheduledAt: Date
  durationMinutes: number
  clinicPhysiotherapistId: string
  seriesId: string
}

export type BusyInterval = {
  clinicPhysiotherapistId: string
  start: Date
  end: Date
}

export type SlotConflict = {
  slot: ProposedSlot
  reason: 'staff' | 'batch'
}

export function padIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function localIsoDate(date = new Date()): string {
  return padIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function addDaysIso(from: string, days: number): string {
  const [year, month, day] = from.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return localIsoDate(date)
}

export function weekdayOfIsoDate(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

export function eachIsoDateInclusive(from: string, to: string): string[] {
  if (!from || !to || from > to) return []
  const dates: string[] = []
  let current = from
  while (current <= to) {
    dates.push(current)
    current = addDaysIso(current, 1)
  }
  return dates
}

export function expandWeeklySchedule(from: string, to: string, series: WeeklySeries[]): ProposedSlot[] {
  const slots: ProposedSlot[] = []
  for (const date of eachIsoDateInclusive(from, to)) {
    const weekday = weekdayOfIsoDate(date)
    for (const item of series) {
      if (!item.clinicPhysiotherapistId || !item.time || !item.weekdays.includes(weekday)) continue
      slots.push({
        date,
        time: item.time,
        scheduledAt: combineDateAndTime(new Date(`${date}T12:00:00`), item.time),
        durationMinutes: item.durationMinutes,
        clinicPhysiotherapistId: item.clinicPhysiotherapistId,
        seriesId: item.id,
      })
    }
  }
  return slots.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}

export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime()
}

export function findSlotConflicts(slots: ProposedSlot[], busy: BusyInterval[] = []): SlotConflict[] {
  const conflicts: SlotConflict[] = []
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index]
    const start = slot.scheduledAt
    const end = new Date(start.getTime() + slot.durationMinutes * 60_000)
    const hitsBusy = busy.some(
      (item) =>
        item.clinicPhysiotherapistId === slot.clinicPhysiotherapistId &&
        intervalsOverlap(start, end, item.start, item.end),
    )
    if (hitsBusy) {
      conflicts.push({ slot, reason: 'staff' })
      continue
    }
    const hitsBatch = slots.some((other, otherIndex) => {
      if (otherIndex === index) return false
      if (other.clinicPhysiotherapistId !== slot.clinicPhysiotherapistId) return false
      const otherEnd = new Date(other.scheduledAt.getTime() + other.durationMinutes * 60_000)
      return intervalsOverlap(start, end, other.scheduledAt, otherEnd)
    })
    if (hitsBatch) conflicts.push({ slot, reason: 'batch' })
  }
  return conflicts
}
