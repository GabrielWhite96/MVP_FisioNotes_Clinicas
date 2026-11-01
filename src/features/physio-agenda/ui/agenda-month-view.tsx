import { format, isSameDay, isSameMonth, isToday } from 'date-fns'
import type { AppointmentWithRelations } from '@/entities/appointment/api/appointment-api'
import { cn } from '@/shared/lib/utils'
import { filterAppointmentsForDay } from '@/features/physio-agenda/model/agenda-utils'
import { pt } from '@/shared/config/i18n/pt'

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function AgendaMonthView({
  days,
  anchor,
  selectedDay,
  appointments,
  onSelectDay,
}: {
  days: Date[]
  anchor: Date
  selectedDay: Date
  appointments: AppointmentWithRelations[]
  onSelectDay: (day: Date) => void
}) {
  return (
    <div className="rounded-lg border bg-[var(--color-card)] p-3 sm:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-xs font-medium text-[var(--color-muted-foreground)]"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayAppointments = filterAppointmentsForDay(appointments, day)
          const inMonth = isSameMonth(day, anchor)
          const selected = isSameDay(day, selectedDay)
          const today = isToday(day)
          const count = dayAppointments.length

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'flex min-h-[4.5rem] flex-col items-start rounded-md border border-transparent p-1.5 text-left transition-colors hover:bg-[var(--color-accent)]',
                !inMonth && 'opacity-40',
                selected && 'border-[var(--color-primary)] bg-[var(--color-secondary)]',
                today && !selected && 'border-[var(--color-border)]'
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-sm',
                  today && 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                )}
              >
                {format(day, 'd')}
              </span>
              {count > 0 && (
                <div className="mt-auto flex w-full flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    {dayAppointments.slice(0, 3).map((a) => (
                      <span
                        key={a.id}
                        className={cn(
                          'h-1.5 flex-1 rounded-full',
                          a.modality === 'home_visit' ? 'bg-amber-500' : 'bg-[var(--color-primary)]'
                        )}
                      />
                    ))}
                  </div>
                  {count > 3 && (
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      +{count - 3} {pt.agenda.more}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
