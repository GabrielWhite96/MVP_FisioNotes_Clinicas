import { format, parseISO, addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import { ptBR, enCA } from 'date-fns/locale'
import { getLocale } from '@/shared/config/i18n'

export const DEFAULT_TZ = 'America/Edmonton'

/** Format an ISO/UTC instant in a user timezone via Intl (stores remain UTC). */
export function formatInTimeZone(
  date: string | Date,
  timeZone = DEFAULT_TZ,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'short',
    timeStyle: 'short',
  }
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const locale = getLocale() === 'en' ? 'en-CA' : 'pt-BR'
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(d)
  } catch {
    return format(d, "dd/MM/yyyy HH:mm", { locale: getLocale() === 'en' ? enCA : ptBR })
  }
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  const locale = getLocale() === 'en' ? enCA : ptBR
  return format(d, pattern, { locale })
}

export function formatDateTime(date: string | Date, timeZone = DEFAULT_TZ) {
  return formatInTimeZone(date, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(time: string) {
  return time.slice(0, 5)
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes = 60,
  existingSlots: string[] = []
): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  let current = startH * 60 + startM
  const end = endH * 60 + endM

  while (current + intervalMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0')
    const m = (current % 60).toString().padStart(2, '0')
    const slot = `${h}:${m}`
    if (!existingSlots.includes(slot)) {
      slots.push(slot)
    }
    current += intervalMinutes
  }
  return slots
}

export function combineDateAndTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h, m, 0, 0)
  return result
}

export function isUpcoming(date: string) {
  return isAfter(parseISO(date), new Date())
}

export function isToday(date: string) {
  const d = parseISO(date)
  const now = new Date()
  return isAfter(d, startOfDay(now)) && isBefore(d, endOfDay(now))
}

export function isSameCalendarDay(date: string | Date, now = new Date()) {
  const value = typeof date === 'string' ? parseISO(date) : date
  return value.toDateString() === now.toDateString()
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return days[dayOfWeek] ?? ''
}

export function addDuration(date: string, minutes: number) {
  return addMinutes(parseISO(date), minutes).toISOString()
}
