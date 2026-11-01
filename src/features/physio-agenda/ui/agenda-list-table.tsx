import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { AppointmentWithRelations } from '@/entities/appointment/api/appointment-api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { ROUTES, MODALITY_LABELS, APPOINTMENT_STATUS_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { getPatientDisplayName } from '@/features/physio-agenda/model/agenda-utils'

export function AgendaListTable({
  appointments,
}: {
  appointments: AppointmentWithRelations[]
}) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border bg-[var(--color-card)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        {pt.agenda.emptyList}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-[var(--color-card)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{pt.agenda.colDate}</TableHead>
            <TableHead>{pt.agenda.colTime}</TableHead>
            <TableHead>{pt.agenda.colPatient}</TableHead>
            <TableHead className="hidden sm:table-cell">{pt.agenda.colModality}</TableHead>
            <TableHead>{pt.agenda.colStatus}</TableHead>
            <TableHead className="hidden md:table-cell">{pt.agenda.colDuration}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => {
            const start = parseISO(appointment.scheduled_at)
            return (
              <TableRow key={appointment.id}>
                <TableCell>
                  <Link
                    to={ROUTES.physio.appointment(appointment.id)}
                    className="font-medium hover:underline"
                  >
                    {format(start, 'dd/MM/yyyy')}
                  </Link>
                </TableCell>
                <TableCell>{format(start, 'HH:mm')}</TableCell>
                <TableCell>{getPatientDisplayName(appointment)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary">{MODALITY_LABELS[appointment.modality]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{APPOINTMENT_STATUS_LABELS[appointment.status]}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {appointment.duration_minutes} min
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
