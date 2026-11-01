import { useNavigate } from 'react-router-dom'
import { format, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AppointmentWithRelations } from '@/entities/appointment/api/appointment-api'
import { cn } from '@/shared/lib/utils'
import { AgendaEventBlock } from '@/features/physio-agenda/ui/agenda-event-block'
import {
  AGENDA_HOUR_START,
  agendaGridHeightPx,
  buildNewAppointmentHref,
  filterAppointmentsForDay,
  hourLabels,
  HOUR_HEIGHT_PX,
  timeFromColumnClick,
} from '@/features/physio-agenda/model/agenda-utils'

function TimeColumn() {
  return (
    <div className="relative w-12 shrink-0 sm:w-14" style={{ height: agendaGridHeightPx() }}>
      {hourLabels().map((hour) => (
        <div
          key={hour}
          className="absolute right-1 -translate-y-1/2 text-[10px] text-[var(--color-muted-foreground)] sm:text-xs"
          style={{ top: (hour - AGENDA_HOUR_START) * HOUR_HEIGHT_PX }}
        >
          {`${String(hour).padStart(2, '0')}:00`}
        </div>
      ))}
    </div>
  )
}

function DayColumn({
  day,
  appointments,
  selected,
  onSelectDay,
  showHeader,
}: {
  day: Date
  appointments: AppointmentWithRelations[]
  selected: boolean
  onSelectDay: (day: Date) => void
  showHeader?: boolean
}) {
  const navigate = useNavigate()
  const dayAppointments = filterAppointmentsForDay(appointments, day)

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const time = timeFromColumnClick(offsetY)
    onSelectDay(day)
    navigate(buildNewAppointmentHref(day, time))
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {showHeader && (
        <button
          type="button"
          onClick={() => onSelectDay(day)}
          className={cn(
            'mb-1 flex min-h-10 flex-col items-center rounded-md px-1 py-1 text-center',
            selected && 'bg-[var(--color-secondary)]',
            isToday(day) && 'font-semibold text-[var(--color-primary)]'
          )}
        >
          <span className="text-[10px] uppercase text-[var(--color-muted-foreground)] sm:text-xs">
            {format(day, 'EEE', { locale: ptBR })}
          </span>
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-sm',
              isToday(day) && 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
            )}
          >
            {format(day, 'd')}
          </span>
        </button>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={handleColumnClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelectDay(day)
        }}
        className={cn(
          'relative cursor-pointer border-l border-[var(--color-border)]',
          selected && 'bg-[var(--color-accent)]/30'
        )}
        style={{ height: agendaGridHeightPx() }}
      >
        {hourLabels().map((hour) => (
          <div
            key={hour}
            className="pointer-events-none absolute right-0 left-0 border-t border-[var(--color-border)]/70"
            style={{ top: (hour - AGENDA_HOUR_START) * HOUR_HEIGHT_PX }}
          />
        ))}
        {dayAppointments.map((appointment) => (
          <AgendaEventBlock key={appointment.id} appointment={appointment} positioned compact />
        ))}
      </div>
    </div>
  )
}

export function AgendaDayView({
  day,
  appointments,
  onSelectDay,
}: {
  day: Date
  appointments: AppointmentWithRelations[]
  onSelectDay: (day: Date) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-[var(--color-card)]">
      <div className="flex gap-0 p-2 sm:p-3">
        <TimeColumn />
        <DayColumn
          day={day}
          appointments={appointments}
          selected
          onSelectDay={onSelectDay}
          showHeader={false}
        />
      </div>
    </div>
  )
}

export function AgendaWeekView({
  days,
  appointments,
  selectedDay,
  onSelectDay,
}: {
  days: Date[]
  appointments: AppointmentWithRelations[]
  selectedDay: Date
  onSelectDay: (day: Date) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-[var(--color-card)]">
      <div className="flex min-w-[640px] gap-0 p-2 sm:p-3">
        <div className="flex w-12 shrink-0 flex-col sm:w-14">
          <div className="mb-1 h-10" />
          <TimeColumn />
        </div>
        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            appointments={appointments}
            selected={isSameDay(day, selectedDay)}
            onSelectDay={onSelectDay}
            showHeader
          />
        ))}
      </div>
    </div>
  )
}
