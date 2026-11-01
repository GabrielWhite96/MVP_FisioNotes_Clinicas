import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, FileDown } from 'lucide-react'
import { getAppointments } from '@/entities/appointment/api/appointment-api'
import { getCheckIns, getAdherenceScore } from '@/entities/check-in/api/check-in-api'
import { getClinicalRecords } from '@/entities/clinical-record/api/clinical-record-api'
import { getPatientExercises } from '@/entities/exercise/api/exercise-api'
import { getPhysioOwnedPatients, getPatientById } from '@/entities/patient/api/patient-api'
import { getPhysiotherapistByProfileId } from '@/entities/physiotherapist/api/physiotherapist-api'
import { listClinicPhysiotherapists } from '@/entities/clinic-physiotherapist/api/clinic-physiotherapist-api'
import { getActiveTreatmentPlan, getTreatmentGoals } from '@/entities/treatment-plan/api/treatment-plan-api'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  buildPatientReport,
  type ReportExerciseInput,
  type ReportPeriod,
  type ReportRecordInput,
} from '@/features/patient-report/model/build-patient-report'
import { PatientReportDocument } from '@/features/patient-report/ui/patient-report-document'
import { downloadPatientReportPdf } from '@/features/patient-report/pdf/patient-report-pdf'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { CLINICAL_STATUS_LABELS, ROUTES } from '@/shared/config/routes'
import { formatDateTime } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { EmptyState, ErrorState, LoadingSpinner } from '@/shared/ui/states'

const copy = pt.report

const PERIODS: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'all', label: copy.periodAll },
  { value: '90d', label: copy.period90 },
  { value: '30d', label: copy.period30 },
]

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function mapRecords(rows: unknown): ReportRecordInput[] {
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const record = row as ReportRecordInput
    if (!record.id || !record.created_at || !record.record_type) return []
    return [{
      id: record.id,
      record_type: record.record_type,
      structured_data: record.structured_data ?? null,
      created_at: record.created_at,
      next_evaluation_at: record.next_evaluation_at ?? null,
      observations: record.observations ?? null,
      evolution: record.evolution ?? null,
    }]
  })
}

function mapExercises(rows: unknown): ReportExerciseInput[] {
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const item = row as {
      id?: string
      active?: boolean
      sets?: number | null
      reps?: number | null
      frequency?: string | null
      exercise?: { title?: string } | Array<{ title?: string }> | null
      completions?: Array<{ completed_at?: string }> | null
    }
    if (!item.id || item.active === false) return []
    const exercise = Array.isArray(item.exercise) ? item.exercise[0] : item.exercise
    return [{
      id: item.id,
      title: exercise?.title || copy.exercise,
      sets: item.sets ?? null,
      reps: item.reps ?? null,
      frequency: item.frequency ?? null,
      completions: (item.completions ?? [])
        .filter((completion) => Boolean(completion.completed_at))
        .map((completion) => ({ completed_at: completion.completed_at as string })),
    }]
  })
}

type ReportHubTab = 'clinical' | 'patient-links' | 'staff-links'

export function PhysioReportsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<ReportHubTab>('clinical')
  const physioQuery = useQuery({
    queryKey: queryKeys.physiotherapist(user?.id ?? ''),
    queryFn: () => getPhysiotherapistByProfileId(user!.id),
    enabled: !!user?.id,
  })
  const patientsQuery = useQuery({
    queryKey: queryKeys.physioPatients(physioQuery.data?.id ?? ''),
    queryFn: () => getPhysioOwnedPatients(physioQuery.data!.id),
    enabled: !!physioQuery.data?.id,
  })
  const staffQuery = useQuery({
    queryKey: queryKeys.clinicPhysiotherapists(physioQuery.data?.id ?? ''),
    queryFn: () => listClinicPhysiotherapists(physioQuery.data!.id),
    enabled: !!physioQuery.data?.id && tab === 'staff-links',
  })

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (patientsQuery.data ?? []).filter((patient) => {
      if (!query) return true
      return (
        patient.full_name.toLowerCase().includes(query) ||
        (patient.email ?? '').toLowerCase().includes(query) ||
        (patient.phone ?? '').toLowerCase().includes(query)
      )
    })
  }, [patientsQuery.data, search])

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (staffQuery.data ?? []).filter((staff) => {
      if (!query) return true
      return (
        staff.full_name.toLowerCase().includes(query) ||
        (staff.email ?? '').toLowerCase().includes(query) ||
        (staff.license_number ?? '').toLowerCase().includes(query)
      )
    })
  }, [staffQuery.data, search])

  const loadingPatients = physioQuery.isLoading || patientsQuery.isLoading
  const loadingStaff = physioQuery.isLoading || staffQuery.isLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{copy.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{pt.clinic.reportsHubSubtitle}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {([
          { id: 'clinical' as const, title: pt.clinic.clinicalReport, hint: pt.clinic.clinicalReportHint },
          { id: 'patient-links' as const, title: pt.clinic.patientLinksReport, hint: pt.clinic.patientLinksReportHint },
          { id: 'staff-links' as const, title: pt.clinic.staffLinksReport, hint: pt.clinic.staffLinksReportHint },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => { setTab(item.id); setSearch('') }}
            className={cn(
              'rounded-xl border p-4 text-left transition-colors',
              tab === item.id
                ? 'border-[var(--color-primary)] bg-[var(--color-accent)]'
                : 'bg-[var(--color-card)] hover:border-[var(--color-primary)]',
            )}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{item.hint}</p>
          </button>
        ))}
      </div>
      <Input
        aria-label={tab === 'staff-links' ? pt.clinic.searchStaff : copy.search}
        placeholder={tab === 'staff-links' ? pt.clinic.searchStaff : copy.search}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {tab !== 'staff-links' && loadingPatients && <LoadingSpinner />}
      {tab === 'staff-links' && loadingStaff && <LoadingSpinner />}
      {tab !== 'staff-links' && !filteredPatients.length && !loadingPatients && (
        <EmptyState title={copy.empty} description={copy.emptyHint} />
      )}
      {tab === 'staff-links' && !filteredStaff.length && !loadingStaff && (
        <EmptyState title={pt.clinic.emptyStaff} description={pt.clinic.emptyStaffHint} />
      )}
      {tab !== 'staff-links' && (
        <div className="space-y-2">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              to={tab === 'clinical' ? ROUTES.physio.patientReport(patient.id) : ROUTES.physio.patientAssignmentReport(patient.id)}
              className="flex items-center gap-4 rounded-xl border bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)]"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{patient.full_name}</p>
                  <Badge variant="secondary">{CLINICAL_STATUS_LABELS[patient.clinical_status]}</Badge>
                </div>
                <p className="truncate text-sm text-[var(--color-muted-foreground)]">
                  {[patient.email, patient.city].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <span className="hidden text-sm font-medium text-[var(--color-primary)] sm:inline">{copy.open}</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]" />
            </Link>
          ))}
        </div>
      )}
      {tab === 'staff-links' && (
        <div className="space-y-2">
          {filteredStaff.map((staff) => (
            <Link
              key={staff.id}
              to={ROUTES.physio.staffAssignmentReport(staff.id)}
              className="flex items-center gap-4 rounded-xl border bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)]"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-semibold">{staff.full_name}</p>
                <p className="truncate text-sm text-[var(--color-muted-foreground)]">
                  {[staff.license_number, staff.email].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function PhysioPatientReportPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [period, setPeriod] = useState<ReportPeriod>('all')
  const [conclusion, setConclusion] = useState('')
  const [issuedAt] = useState(() => formatDateTime(new Date()))
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const patientQuery = useQuery({
    queryKey: queryKeys.patientDetail(id ?? ''),
    queryFn: () => getPatientById(id!),
    enabled: !!id,
  })
  const recordsQuery = useQuery({
    queryKey: queryKeys.clinicalRecords(id ?? ''),
    queryFn: () => getClinicalRecords(id!),
    enabled: !!id,
  })
  const checkInsQuery = useQuery({
    queryKey: queryKeys.checkIns(id ?? ''),
    queryFn: () => getCheckIns(id!),
    enabled: !!id,
  })
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments({ patientId: id, scope: 'report' }),
    queryFn: () => getAppointments({ patientId: id! }),
    enabled: !!id,
  })
  const exercisesQuery = useQuery({
    queryKey: queryKeys.patientExercises(id ?? ''),
    queryFn: () => getPatientExercises(id!),
    enabled: !!id,
  })
  const planQuery = useQuery({
    queryKey: queryKeys.activeTreatmentPlan(id ?? ''),
    queryFn: () => getActiveTreatmentPlan(id!),
    enabled: !!id,
  })
  const goalsQuery = useQuery({
    queryKey: queryKeys.treatmentGoals(planQuery.data?.id ?? ''),
    queryFn: () => getTreatmentGoals(planQuery.data!.id),
    enabled: !!planQuery.data?.id,
  })
  const adherence7Query = useQuery({
    queryKey: [...queryKeys.adherence(id ?? ''), 7],
    queryFn: () => getAdherenceScore(id!, 7),
    enabled: !!id,
  })
  const adherence30Query = useQuery({
    queryKey: [...queryKeys.adherence(id ?? ''), 30],
    queryFn: () => getAdherenceScore(id!, 30),
    enabled: !!id,
  })

  const report = useMemo(() => {
    if (!patientQuery.data) return null
    const plan = planQuery.data
    return buildPatientReport({
      period,
      now: new Date(),
      adherence7: adherence7Query.data ?? null,
      adherence30: adherence30Query.data ?? null,
      checkIns: checkInsQuery.data ?? [],
      records: mapRecords(recordsQuery.data),
      appointments: (appointmentsQuery.data ?? []).map((item) => ({
        id: item.id,
        status: item.status,
        scheduled_at: item.scheduled_at,
      })),
      exercises: mapExercises(exercisesQuery.data),
      plan: plan
        ? {
            condition: plan.condition,
            primary_goal: plan.primary_goal,
            frequency: plan.frequency,
            duration_weeks: plan.duration_weeks,
            status: plan.status,
            started_at: plan.started_at,
            goals: (goalsQuery.data ?? []).map((goal) => ({
              title: goal.title,
              metric_type: goal.metric_type,
              current_value: asNumber(goal.current_value),
              target_value: asNumber(goal.target_value),
              unit: goal.unit,
            })),
          }
        : null,
    })
  }, [
    patientQuery.data,
    period,
    adherence7Query.data,
    adherence30Query.data,
    checkInsQuery.data,
    recordsQuery.data,
    appointmentsQuery.data,
    exercisesQuery.data,
    planQuery.data,
    goalsQuery.data,
  ])

  const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? copy.periodAll
  const loading =
    patientQuery.isLoading ||
    recordsQuery.isLoading ||
    checkInsQuery.isLoading ||
    appointmentsQuery.isLoading ||
    exercisesQuery.isLoading ||
    planQuery.isLoading ||
    (planQuery.data?.id ? goalsQuery.isLoading : false) ||
    adherence7Query.isLoading ||
    adherence30Query.isLoading
  const failed =
    patientQuery.isError ||
    recordsQuery.isError ||
    checkInsQuery.isError ||
    appointmentsQuery.isError ||
    exercisesQuery.isError ||
    planQuery.isError

  const handleDownload = async () => {
    if (!patientQuery.data || !report || generatingPdf) return
    setGeneratingPdf(true)
    setPdfError(null)
    try {
      await downloadPatientReportPdf({
        patientName: patientQuery.data.full_name,
        dateOfBirth: patientQuery.data.date_of_birth,
        clinicalStatus: patientQuery.data.clinical_status,
        physioName: profile?.full_name ?? '',
        periodLabel,
        issuedAt,
        report,
        conclusion,
      })
    } catch {
      setPdfError(copy.pdfError)
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    
      <div className="space-y-6">
        <div className="no-print sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-[var(--color-background)]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.physio.reports}>{copy.backToList}</Link>
            </Button>
            {id && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={ROUTES.physio.patient(id)}>{copy.backToPatient}</Link>
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label={copy.period} className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-muted)] p-1">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={period === item.value}
                  onClick={() => setPeriod(item.value)}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    period === item.value
                      ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                      : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button onClick={handleDownload} disabled={generatingPdf || loading || !report}>
              <FileDown className="h-4 w-4" />
              {generatingPdf ? copy.generatingPdf : copy.print}
            </Button>
          </div>
          {pdfError ? <p className="w-full text-sm text-[var(--color-destructive)]">{pdfError}</p> : null}
        </div>

        {loading && <LoadingSpinner className="mx-auto mt-8 h-8 w-8" />}
        {!loading && failed && <ErrorState message={pt.common.error} />}
        {!loading && !failed && !patientQuery.data && (
          <ErrorState message="Paciente não encontrado" />
        )}
        {!loading && !failed && patientQuery.data && report && (
          <PatientReportDocument
            patientName={patientQuery.data.full_name}
            dateOfBirth={patientQuery.data.date_of_birth}
            clinicalStatus={patientQuery.data.clinical_status}
            physioName={profile?.full_name ?? ''}
            periodLabel={periodLabel}
            issuedAt={issuedAt}
            report={report}
            conclusion={conclusion}
            onConclusionChange={setConclusion}
          />
        )}
      </div>
    
  )
}
