import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import type { AppointmentWithRelations } from '@/entities/appointment/api/appointment-api'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { MODALITY_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { AgendaEventBlock } from '@/features/physio-agenda/ui/agenda-event-block'
import {
  buildNewAppointmentHref,
  filterAppointmentsForDay,
} from '@/features/physio-agenda/model/agenda-utils'

export function AgendaSidePanel({
  selectedDay,
  appointments,
}: {
  selectedDay: Date
  appointments: AppointmentWithRelations[]
}) {
  const dayAppointments = filterAppointmentsForDay(appointments, selectedDay)
  const telehealthCount = dayAppointments.filter((a) => a.modality === 'telehealth').length
  const homeCount = dayAppointments.filter((a) => a.modality === 'home_visit').length

  return (
    <aside className="flex flex-col gap-4 rounded-lg border bg-[var(--color-card)] p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {pt.agenda.selectedDay}
        </p>
        <h2 className="text-lg font-semibold capitalize">
          {format(selectedDay, "EEEE, d 'de' MMM", { locale: ptBR })}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {dayAppointments.length === 0
            ? pt.agenda.noAppointmentsDay
            : pt.agenda.appointmentsCount.replace('{count}', String(dayAppointments.length))}
        </p>
      </div>

      {dayAppointments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {telehealthCount > 0 && (
            <Badge variant="secondary">
              {MODALITY_LABELS.telehealth}: {telehealthCount}
            </Badge>
          )}
          {homeCount > 0 && (
            <Badge variant="outline">
              {MODALITY_LABELS.home_visit}: {homeCount}
            </Badge>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {dayAppointments.map((appointment) => (
          <AgendaEventBlock key={appointment.id} appointment={appointment} />
        ))}
      </div>

      <Button asChild className="mt-auto w-full">
        <Link to={buildNewAppointmentHref(selectedDay)}>
          <Plus className="mr-2 h-4 w-4" />
          {pt.physio.newAppointment}
        </Link>
      </Button>

      <div className="space-y-1 border-t pt-3 text-xs text-[var(--color-muted-foreground)]">
        <p className="font-medium text-[var(--color-foreground)]">{pt.agenda.legend}</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          {MODALITY_LABELS.telehealth}
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {MODALITY_LABELS.home_visit}
        </div>
        <p className="pt-1">{pt.agenda.clickSlotHint}</p>
      </div>
    </aside>
  )
}
