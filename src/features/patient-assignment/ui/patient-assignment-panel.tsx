import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listPatientAttendance } from '@/entities/appointment/api/appointment-api'
import {
  groupAttendanceByParty,
  localTimeHmFromInstant,
} from '@/entities/appointment/model/attendance-report'
import { WEEKDAY_SHORT } from '@/entities/appointment/model/bulk-schedule'
import { ClinicBulkScheduleForm } from '@/features/appointments/ui/clinic-bulk-schedule-form'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { formatDate, formatDateTime } from '@/shared/lib/dates'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'

export function PatientResponsibleSummary({ patientId }: { patientId: string }) {
  const attendanceQuery = useQuery({
    queryKey: queryKeys.patientAttendance(patientId),
    queryFn: () => listPatientAttendance(patientId),
    enabled: !!patientId,
  })

  const groups = useMemo(
    () => groupAttendanceByParty(
      (attendanceQuery.data ?? []).map((item) => ({
        id: item.id,
        scheduledAt: item.scheduled_at,
        durationMinutes: item.duration_minutes,
        status: item.status,
        groupId: item.clinic_physiotherapist_id ?? 'unassigned',
        groupName: item.clinic_physiotherapist?.full_name ?? '—',
      })),
    ),
    [attendanceQuery.data],
  )

  if (attendanceQuery.isLoading) return <LoadingSpinner className="h-6 w-6" />
  if (!groups.length) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.noResponsible}</p>
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="font-semibold">{group.name}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {group.weekdayLabel} · {group.timesLabel}
          </p>
        </div>
      ))}
    </div>
  )
}

export function PatientAssignmentPanel({
  patientId,
  practiceId,
  canEdit,
}: {
  patientId: string
  practiceId: string
  canEdit: boolean
}) {
  const attendanceQuery = useQuery({
    queryKey: queryKeys.patientAttendance(patientId),
    queryFn: () => listPatientAttendance(patientId),
    enabled: !!patientId,
  })

  const groups = useMemo(
    () => groupAttendanceByParty(
      (attendanceQuery.data ?? []).map((item) => ({
        id: item.id,
        scheduledAt: item.scheduled_at,
        durationMinutes: item.duration_minutes,
        status: item.status,
        groupId: item.clinic_physiotherapist_id ?? 'unassigned',
        groupName: item.clinic_physiotherapist?.full_name ?? '—',
      })),
    ),
    [attendanceQuery.data],
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pt.clinic.currentResponsible}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendanceQuery.isLoading ? (
            <LoadingSpinner />
          ) : groups.length ? (
            groups.map((group) => (
              <div key={group.id} className="rounded-lg border p-3">
                <p className="font-medium">{group.name}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {pt.clinic.attendancePeriod}: {formatDate(group.firstAt)} — {formatDate(group.lastAt)}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {pt.clinic.daysAndTimes}: {group.weekdayLabel} · {group.timesLabel}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {group.sessionCount} {pt.clinic.sessionsCount}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.noResponsible}</p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.physio.patientAssignmentReport(patientId)}>{pt.clinic.patientLinksReport}</Link>
          </Button>
        </CardContent>
      </Card>

      {canEdit && <ClinicBulkScheduleForm practiceId={practiceId} preselectedPatientId={patientId} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pt.clinic.assignmentHistory}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!attendanceQuery.data?.length && !attendanceQuery.isLoading && (
            <EmptyState title={pt.clinic.emptyAssignments} description={pt.clinic.emptyAssignmentsHint} />
          )}
          {(attendanceQuery.data ?? []).map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">{appointment.clinic_physiotherapist?.full_name ?? '—'}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatDateTime(appointment.scheduled_at)}
                  {' · '}
                  {WEEKDAY_SHORT[new Date(appointment.scheduled_at).getDay()]}
                  {' · '}
                  {localTimeHmFromInstant(appointment.scheduled_at)}
                </p>
              </div>
              <Badge variant="outline">{appointment.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
