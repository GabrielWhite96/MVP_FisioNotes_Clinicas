import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { AppointmentWithRelations } from '@/entities/appointment/api/appointment-api'
import { ROUTES, MODALITY_LABELS, APPOINTMENT_STATUS_LABELS } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import {
  eventPositionStyle,
  getPatientDisplayName,
  modalityAccentClass,
} from '@/features/physio-agenda/model/agenda-utils'

export function AgendaEventBlock({
  appointment,
  compact,
  positioned,
}: {
  appointment: AppointmentWithRelations
  compact?: boolean
  positioned?: boolean
}) {
  const name = getPatientDisplayName(appointment)
  const start = parseISO(appointment.scheduled_at)
  const timeLabel = format(start, 'HH:mm')
  const style = positioned
    ? eventPositionStyle(appointment.scheduled_at, appointment.duration_minutes ?? 60)
    : undefined

  return (
    <Link
      to={ROUTES.physio.appointment(appointment.id)}
      title={`${timeLabel} · ${name} · ${MODALITY_LABELS[appointment.modality]}`}
      style={style}
      className={cn(
        'block overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs leading-tight shadow-sm transition-opacity hover:opacity-90',
        modalityAccentClass(appointment.modality),
        positioned && 'absolute right-0.5 left-0.5 z-10',
        compact ? 'line-clamp-2' : 'line-clamp-3'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-semibold">{timeLabel}</span>
      {!compact && <span className="mx-1 opacity-60">·</span>}
      <span className={compact ? 'block truncate font-medium' : 'font-medium'}>{name}</span>
      {!compact && (
        <span className="mt-0.5 block truncate opacity-80">
          {MODALITY_LABELS[appointment.modality]} · {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </span>
      )}
    </Link>
  )
}
