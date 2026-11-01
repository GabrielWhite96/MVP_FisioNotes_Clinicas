import {
  addDays,
  addMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AppointmentWithRelations } from '@/entities/appointment/api/appointment-api'
import type { AppointmentModality, AppointmentStatus } from '@/shared/types/database'

export const AGENDA_HOUR_START = 7
export const AGENDA_HOUR_END = 21
export const HOUR_HEIGHT_PX = 56

export type AgendaView = 'day' | 'week' | 'month' | 'list'

export const ACTIVE_AGENDA_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'completed',
]

export function getPatientDisplayName(appointment: AppointmentWithRelations): string {
  return (
    appointment.patient?.full_name ??
    appointment.patient?.profiles?.full_name ??
    'Paciente'
  )
}

export function weekStartsOnMonday(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function weekEndsOnSunday(date: Date) {
  return endOfWeek(date, { weekStartsOn: 1 })
}

export function getWeekDays(anchor: Date): Date[] {
  const start = weekStartsOnMonday(anchor)
  return eachDayOfInterval({ start, end: addDays(start, 6) })
}

export function getMonthGridDays(anchor: Date): Date[] {
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const gridStart = weekStartsOnMonday(monthStart)
  const gridEnd = weekEndsOnSunday(monthEnd)
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function filterAppointmentsForDay(
  appointments: AppointmentWithRelations[],
  day: Date
): AppointmentWithRelations[] {
  return appointments
    .filter((a) => isSameDay(parseISO(a.scheduled_at), day))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
}

export function filterAppointmentsInRange(
  appointments: AppointmentWithRelations[],
  start: Date,
  end: Date
): AppointmentWithRelations[] {
  const startMs = start.getTime()
  const endMs = end.getTime()
  return appointments
    .filter((a) => {
      const t = parseISO(a.scheduled_at).getTime()
      return t >= startMs && t <= endMs
    })
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
}

export function minutesFromAgendaStart(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() - AGENDA_HOUR_START * 60
}

export function eventPositionStyle(scheduledAt: string, durationMinutes: number) {
  const start = parseISO(scheduledAt)
  const topMinutes = minutesFromAgendaStart(start)
  const totalMinutes = (AGENDA_HOUR_END - AGENDA_HOUR_START) * 60
  const clampedTop = Math.max(0, Math.min(topMinutes, totalMinutes - 15))
  const heightMinutes = Math.max(20, durationMinutes)
  const maxHeight = totalMinutes - clampedTop
  const height = Math.min(heightMinutes, maxHeight)

  return {
    top: `${(clampedTop / 60) * HOUR_HEIGHT_PX}px`,
    height: `${(height / 60) * HOUR_HEIGHT_PX}px`,
  }
}

export function agendaGridHeightPx() {
  return (AGENDA_HOUR_END - AGENDA_HOUR_START) * HOUR_HEIGHT_PX
}

export function hourLabels(): number[] {
  const hours: number[] = []
  for (let h = AGENDA_HOUR_START; h < AGENDA_HOUR_END; h++) hours.push(h)
  return hours
}

/** Snap click Y in a day column to a 15-min slot time string HH:mm */
export function timeFromColumnClick(offsetY: number): string {
  const totalMinutes = Math.max(0, Math.floor((offsetY / HOUR_HEIGHT_PX) * 60))
  const snapped = Math.floor(totalMinutes / 15) * 15
  const hours = AGENDA_HOUR_START + Math.floor(snapped / 60)
  const minutes = snapped % 60
  const clampedHours = Math.min(Math.max(hours, AGENDA_HOUR_START), AGENDA_HOUR_END - 1)
  return `${String(clampedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function toDateParam(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function buildNewAppointmentHref(date: Date, time?: string): string {
  const params = new URLSearchParams({ date: toDateParam(date) })
  if (time) params.set('time', time)
  return `/physio/appointments/new?${params.toString()}`
}

export function modalityAccentClass(modality: AppointmentModality): string {
  if (modality === 'home_visit') {
    return 'border-l-[3px] border-l-amber-600 bg-amber-50 text-amber-950'
  }
  return 'border-l-[3px] border-l-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
}

export function statusDotClass(status: AppointmentStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-500'
    case 'completed':
      return 'bg-[var(--color-muted-foreground)]'
    case 'cancelled':
    case 'no_show':
      return 'bg-red-500'
    default:
      return 'bg-[var(--color-primary)]'
  }
}

export function navigateAnchor(anchor: Date, view: AgendaView, direction: -1 | 1): Date {
  if (view === 'day') return addDays(anchor, direction)
  if (view === 'week') return addDays(anchor, direction * 7)
  // month + list navigate by month
  return startOfMonth(addDays(startOfMonth(anchor), direction > 0 ? 32 : -1))
}

export function rangeLabel(anchor: Date, view: AgendaView): string {
  if (view === 'day') {
    return format(anchor, "EEEE, d 'de' MMMM", { locale: ptBR })
  }
  if (view === 'week') {
    const start = weekStartsOnMonday(anchor)
    const end = addDays(start, 6)
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'd')} – ${format(end, "d 'de' MMMM yyyy", { locale: ptBR })}`
    }
    return `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`
  }
  return format(anchor, 'MMMM yyyy', { locale: ptBR })
}

export function appointmentEnd(appointment: AppointmentWithRelations): Date {
  return addMinutes(parseISO(appointment.scheduled_at), appointment.duration_minutes ?? 60)
}

export function isWithinVisibleHours(scheduledAt: string): boolean {
  const d = parseISO(scheduledAt)
  const minutes = d.getHours() * 60 + d.getMinutes()
  return minutes >= AGENDA_HOUR_START * 60 && minutes < AGENDA_HOUR_END * 60
}

export function startOfSelectedDay(date: Date) {
  return startOfDay(date)
}
