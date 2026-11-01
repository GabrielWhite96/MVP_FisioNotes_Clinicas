import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listPatientAttendance } from '@/entities/appointment/api/appointment-api'
import {
  filterSessionsByPeriod,
  groupAttendanceByParty,
} from '@/entities/appointment/model/attendance-report'
import { daysAgoIso, todayIso } from '@/entities/patient-assignment/model/period'
import { getPatientById } from '@/entities/patient/api/patient-api'
import { downloadAssignmentReportPdf } from '@/features/assignment-report/pdf/assignment-report-pdf'
import { AssignmentReportToolbar } from '@/features/assignment-report/ui/assignment-report-toolbar'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { formatDate, formatDateTime } from '@/shared/lib/dates'
import { Button } from '@/shared/ui/button'
import { EmptyState, ErrorState, LoadingSpinner } from '@/shared/ui/states'

export function PatientAssignmentReportPage() {
  const { id } = useParams<{ id: string }>()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [issuedAt] = useState(() => formatDateTime(new Date()))
  const [generating, setGenerating] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const patientQuery = useQuery({
    queryKey: queryKeys.patientDetail(id ?? ''),
    queryFn: () => getPatientById(id!),
    enabled: !!id,
  })
  const attendanceQuery = useQuery({
    queryKey: queryKeys.patientAttendance(id ?? ''),
    queryFn: () => listPatientAttendance(id!),
    enabled: !!id,
  })

  const groups = useMemo(() => {
    const sessions = filterSessionsByPeriod(
      (attendanceQuery.data ?? []).map((item) => ({
        id: item.id,
        scheduledAt: item.scheduled_at,
        durationMinutes: item.duration_minutes,
        status: item.status,
        groupId: item.clinic_physiotherapist_id ?? 'unassigned',
        groupName: item.clinic_physiotherapist?.full_name ?? '—',
      })),
      from || null,
      to || null,
    )
    return groupAttendanceByParty(sessions)
  }, [attendanceQuery.data, from, to])

  const rows = groups.map((group) => ({
    id: group.id,
    name: group.name,
    startedOn: group.firstAt,
    endedOn: group.lastAt,
    weekdayLabel: group.weekdayLabel,
    timesLabel: group.timesLabel,
    sessionCount: group.sessionCount,
    sessions: group.sessions.map((session) => ({ id: session.id, scheduledAt: session.scheduledAt })),
  }))

  const periodLabel = from || to
    ? `${from ? formatDate(from) : '…'} — ${to ? formatDate(to) : pt.clinic.ongoing}`
    : pt.report.periodAll

  const handlePreset = (preset: 'all' | '90d' | '30d') => {
    if (preset === 'all') {
      setFrom('')
      setTo('')
      return
    }
    setFrom(daysAgoIso(preset === '30d' ? 30 : 90))
    setTo(todayIso())
  }

  const handleDownload = async () => {
    if (!patientQuery.data || generating) return
    setGenerating(true)
    setPdfError(null)
    try {
      await downloadAssignmentReportPdf({
        kind: 'patient',
        subjectName: patientQuery.data.full_name,
        periodLabel,
        issuedAt,
        rows,
      })
    } catch {
      setPdfError(pt.report.pdfError)
    } finally {
      setGenerating(false)
    }
  }

  if (patientQuery.isLoading || attendanceQuery.isLoading) {
    return <LoadingSpinner className="mx-auto mt-8 h-8 w-8" />
  }
  if (!patientQuery.data) return <ErrorState message="Paciente não encontrado" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1">
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.physio.reports}>{pt.report.backToList}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.physio.patient(patientQuery.data.id)}>{pt.report.backToPatient}</Link>
        </Button>
      </div>
      <div>
        <h1 className="page-title">{pt.clinic.patientLinksReport}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{patientQuery.data.full_name}</p>
      </div>
      <AssignmentReportToolbar
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onPreset={handlePreset}
        onDownload={handleDownload}
        generating={generating}
      />
      {pdfError && <p className="text-sm text-[var(--color-destructive)]">{pdfError}</p>}
      {!rows.length ? (
        <EmptyState title={pt.clinic.emptyAssignments} description={pt.clinic.emptyAssignmentsHint} />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border p-4">
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {pt.clinic.attendancePeriod}: {formatDate(row.startedOn)} — {formatDate(row.endedOn ?? row.startedOn)}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {pt.clinic.daysAndTimes}: {row.weekdayLabel} · {row.timesLabel}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {row.sessionCount} {pt.clinic.sessionsCount}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
