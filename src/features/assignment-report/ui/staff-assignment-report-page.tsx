import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getClinicPhysiotherapistById } from '@/entities/clinic-physiotherapist/api/clinic-physiotherapist-api'
import { listStaffAssignments } from '@/entities/patient-assignment/api/patient-assignment-api'
import { daysAgoIso, filterAssignmentsByPeriod, todayIso } from '@/entities/patient-assignment/model/period'
import { downloadAssignmentReportPdf } from '@/features/assignment-report/pdf/assignment-report-pdf'
import { AssignmentReportToolbar } from '@/features/assignment-report/ui/assignment-report-toolbar'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { formatDate, formatDateTime } from '@/shared/lib/dates'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { EmptyState, ErrorState, LoadingSpinner } from '@/shared/ui/states'

export function StaffAssignmentReportPage() {
  const { id } = useParams<{ id: string }>()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [issuedAt] = useState(() => formatDateTime(new Date()))
  const [generating, setGenerating] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const staffQuery = useQuery({
    queryKey: queryKeys.clinicPhysiotherapist(id ?? ''),
    queryFn: () => getClinicPhysiotherapistById(id!),
    enabled: !!id,
  })
  const assignmentsQuery = useQuery({
    queryKey: queryKeys.staffAssignments(id ?? ''),
    queryFn: () => listStaffAssignments(id!),
    enabled: !!id,
  })

  const rows = useMemo(() => {
    return filterAssignmentsByPeriod(
      (assignmentsQuery.data ?? []).map((item) => ({
        id: item.id,
        name: item.patients?.full_name ?? '—',
        startedOn: item.started_on,
        endedOn: item.ended_on,
      })),
      from || null,
      to || null,
    )
  }, [assignmentsQuery.data, from, to])

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
    if (!staffQuery.data || generating) return
    setGenerating(true)
    setPdfError(null)
    try {
      await downloadAssignmentReportPdf({
        kind: 'staff',
        subjectName: staffQuery.data.full_name,
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

  if (staffQuery.isLoading || assignmentsQuery.isLoading) {
    return <LoadingSpinner className="mx-auto mt-8 h-8 w-8" />
  }
  if (!staffQuery.data) return <ErrorState message="Fisioterapeuta não encontrado" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1">
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.physio.reports}>{pt.report.backToList}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.physio.staffDetail(staffQuery.data.id)}>{pt.clinic.staffDetail}</Link>
        </Button>
      </div>
      <div>
        <h1 className="page-title">{pt.clinic.staffLinksReport}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{staffQuery.data.full_name}</p>
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
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatDate(row.startedOn)} — {row.endedOn ? formatDate(row.endedOn) : pt.clinic.ongoing}
                </p>
              </div>
              {!row.endedOn && <Badge variant="success">{pt.clinic.currentPeriod}</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
