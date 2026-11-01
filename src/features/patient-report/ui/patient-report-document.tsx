import type { ReactElement, ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PatientReport, ReportVitalPoint, ScaleDelta } from '@/features/patient-report/model/build-patient-report'
import { pt } from '@/shared/config/i18n/pt'
import { CLINICAL_STATUS_LABELS, GOAL_METRIC_LABELS } from '@/shared/config/routes'
import { formatDate } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label, Textarea } from '@/shared/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { BrandMark } from '@/shared/ui/brand'

const copy = pt.report

const PLAN_STATUS: Record<string, string> = {
  active: copy.statusActive,
  completed: copy.statusCompleted,
  paused: copy.statusPaused,
  discharged: copy.statusDischarged,
}

const CHART_GRID = 'var(--color-border)'
const CHART_TICK = { fontSize: 12, fill: 'var(--color-muted-foreground)' }
const TOOLTIP_STYLE = {
  borderRadius: 8,
  borderColor: 'var(--color-border)',
  fontSize: 13,
}

interface PatientReportDocumentProps {
  patientName: string
  dateOfBirth: string | null
  clinicalStatus: string
  physioName: string
  periodLabel: string
  issuedAt: string
  report: PatientReport
  conclusion: string
  onConclusionChange: (value: string) => void
}

type Tone = 'good' | 'bad' | 'neutral'
type ScaleKind = 'pain' | 'good' | 'load'

function formatBirthDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return formatDate(value)
}

function deltaHint(delta: number | null): string | null {
  if (delta == null) return null
  if (delta === 0) return copy.stable
  return delta < 0 ? copy.decreased : copy.increased
}

function formatDelta(scale: ScaleDelta): string {
  if (scale.first == null || scale.last == null) return '—'
  if (scale.delta == null) return String(scale.last)
  const sign = scale.delta > 0 ? `+${scale.delta}` : String(scale.delta)
  return `${scale.first} → ${scale.last} (${sign})`
}

function evolutionTone(kind: 'pain' | 'mobility' | 'confidence', delta: number | null): Tone {
  if (delta == null || delta === 0) return 'neutral'
  if (kind === 'pain') return delta < 0 ? 'good' : 'bad'
  return delta > 0 ? 'good' : 'bad'
}

function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('report-section rounded-xl border bg-[var(--color-card)]', className)}>
      <div className="space-y-1 px-5 pt-5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="text-sm text-[var(--color-muted-foreground)]">{hint}</p> : null}
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  )
}

function EmptyLine({ children }: { children: string }) {
  return <p className="text-sm text-[var(--color-muted-foreground)]">{children}</p>
}

function ChartFrame({ children, className }: { children: ReactElement; className?: string }) {
  return (
    <div className={cn('report-chart h-[300px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function EvolutionCard({
  title,
  scale,
  kind,
}: {
  title: string
  scale: ScaleDelta
  kind: 'pain' | 'mobility' | 'confidence'
}) {
  const tone = evolutionTone(kind, scale.delta)
  const hint = deltaHint(scale.delta)
  return (
    <Card className="report-section overflow-hidden">
      <div
        className={cn(
          'h-1',
          tone === 'good' && 'bg-emerald-600',
          tone === 'bad' && 'bg-rose-600',
          tone === 'neutral' && 'bg-[var(--color-border)]',
        )}
      />
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatDelta(scale)}</p>
        {hint ? (
          <p
            className={cn(
              'mt-1 text-sm font-medium',
              tone === 'good' && 'text-emerald-700',
              tone === 'bad' && 'text-rose-700',
              tone === 'neutral' && 'text-[var(--color-muted-foreground)]',
            )}
          >
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-card)] px-4 py-3">
      <dt className="text-xs text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function ScaleValue({ value, kind }: { value: number | null; kind: ScaleKind }) {
  if (value == null) return <span className="text-[var(--color-muted-foreground)]">—</span>
  const concerning = kind === 'good' ? value <= 3 : value >= 7
  const favorable = kind === 'good' ? value >= 7 : value <= 3
  return (
    <span
      className={cn(
        'inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums',
        concerning && 'bg-rose-50 text-rose-800',
        favorable && 'bg-emerald-50 text-emerald-800',
        !concerning && !favorable && 'bg-[var(--color-muted)] text-[var(--color-foreground)]',
      )}
    >
      {value}
    </span>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  )
}

const VITAL_FIELDS: Array<{ key: keyof ReportVitalPoint; label: string }> = [
  { key: 'hr', label: 'FC' },
  { key: 'rr', label: 'FR' },
  { key: 'spo2', label: 'SpO2' },
  { key: 'bpSystolic', label: 'PA sistólica' },
  { key: 'bpDiastolic', label: 'PA diastólica' },
  { key: 'temperature', label: 'Temperatura' },
]

function hasVitalKey(points: ReportVitalPoint[], key: keyof ReportVitalPoint): boolean {
  return points.some((point) => typeof point[key] === 'number')
}

export function PatientReportDocument({
  patientName,
  dateOfBirth,
  clinicalStatus,
  physioName,
  periodLabel,
  issuedAt,
  report,
  conclusion,
  onConclusionChange,
}: PatientReportDocumentProps) {
  const checkInChart = report.checkIns.map((item) => ({
    date: formatDate(item.at),
    Dor: item.pain,
    Mobilidade: item.mobility,
    Confiança: item.confidence,
    Dificuldade: item.difficulty,
  }))
  const pressureChart = report.vitals.map((item) => ({
    date: formatDate(item.at),
    PAs: item.bpSystolic,
    PAd: item.bpDiastolic,
  }))
  const otherChart = report.vitals.map((item) => ({
    date: formatDate(item.at),
    FC: item.hr,
    FR: item.rr,
    SpO2: item.spo2,
  }))
  const showPressure = report.vitals.length >= 2 && (hasVitalKey(report.vitals, 'bpSystolic') || hasVitalKey(report.vitals, 'bpDiastolic'))
  const showOther = report.vitals.length >= 2 && (hasVitalKey(report.vitals, 'hr') || hasVitalKey(report.vitals, 'rr') || hasVitalKey(report.vitals, 'spo2'))
  const firstVital = report.vitals[0]
  const latestVital = report.vitals[report.vitals.length - 1]
  const attendanceTotal =
    report.attendance.completed +
    report.attendance.cancelled +
    report.attendance.noShow +
    report.attendance.scheduled
  const attendanceParts = [
    { label: copy.attendanceCompleted, value: report.attendance.completed, color: '#0f766e' },
    { label: copy.attendanceScheduled, value: report.attendance.scheduled, color: '#0369a1' },
    { label: copy.attendanceNoShow, value: report.attendance.noShow, color: '#be123c' },
    { label: copy.attendanceCancelled, value: report.attendance.cancelled, color: '#94a3b8' },
  ]
  const statusLabel = CLINICAL_STATUS_LABELS[clinicalStatus] ?? clinicalStatus
  const initial = report.comparison.initial
  const latest = report.comparison.latest

  return (
    <div className="report-document space-y-8">
      <p className="print-page-header hidden text-[var(--color-muted-foreground)]">
        {patientName} · {periodLabel} · {issuedAt}
      </p>

      <header className="report-section rounded-xl border bg-[var(--color-card)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{copy.documentLabel}</p>
          <BrandMark layout="horizontal" size="sm" className="max-h-8" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{patientName}</h1>
          <Badge variant="secondary">{statusLabel}</Badge>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dateOfBirth ? <MetaItem label={copy.dob} value={formatBirthDate(dateOfBirth)} /> : null}
          {physioName ? <MetaItem label={copy.physio} value={physioName} /> : null}
          <MetaItem label={copy.periodLabel} value={periodLabel} />
          <MetaItem label={copy.issuedAt} value={issuedAt} />
        </dl>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{copy.evolutionPeriod}</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <EvolutionCard title={copy.pain} scale={report.pain} kind="pain" />
          <EvolutionCard title={copy.mobility} scale={report.mobility} kind="mobility" />
          <EvolutionCard title={copy.confidence} scale={report.confidence} kind="confidence" />
        </div>
      </section>

      <Section title={copy.howPatientFeels} hint={copy.howPatientFeelsHint}>
        {!report.checkIns.length && <EmptyLine>{copy.emptyCheckIns}</EmptyLine>}
        {report.checkIns.length === 1 && <EmptyLine>{copy.needTwoPoints}</EmptyLine>}
        {report.checkIns.length >= 2 && (
          <ChartFrame>
            <LineChart data={checkInChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="date" tick={CHART_TICK} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} width={28} tick={CHART_TICK} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="Dor" stroke="#be123c" strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="Mobilidade" stroke="#0f766e" strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="Confiança" stroke="#0369a1" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="Dificuldade" stroke="#b45309" strokeWidth={2} strokeDasharray="4 3" dot={false} connectNulls />
            </LineChart>
          </ChartFrame>
        )}
        {report.checkIns.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.date}</TableHead>
                <TableHead>{copy.pain}</TableHead>
                <TableHead>{copy.mobility}</TableHead>
                <TableHead>{copy.confidence}</TableHead>
                <TableHead>{copy.difficulty}</TableHead>
                <TableHead>{copy.notes}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...report.checkIns].reverse().map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap font-medium">{formatDate(item.at)}</TableCell>
                  <TableCell><ScaleValue value={item.pain} kind="pain" /></TableCell>
                  <TableCell><ScaleValue value={item.mobility} kind="good" /></TableCell>
                  <TableCell><ScaleValue value={item.confidence} kind="good" /></TableCell>
                  <TableCell><ScaleValue value={item.difficulty} kind="load" /></TableCell>
                  <TableCell className="max-w-sm">{item.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <section className="report-section space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{copy.indicators}</h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-[var(--color-border)] sm:grid-cols-3 lg:grid-cols-5">
          <Stat label={copy.sessionsDone} value={String(report.attendance.completed)} />
          <Stat label={copy.noShows} value={String(report.attendance.noShow)} />
          <Stat label={copy.adherence7} value={report.adherence7 == null ? '—' : `${report.adherence7}%`} />
          <Stat label={copy.adherence30} value={report.adherence30 == null ? '—' : `${report.adherence30}%`} />
          <Stat
            label={copy.nextEvaluation}
            value={report.nextEvaluationAt ? formatDate(report.nextEvaluationAt) : copy.noNextEvaluation}
          />
        </dl>
      </section>

      <Section title={copy.plan}>
        {!report.plan && <EmptyLine>{copy.emptyPlan}</EmptyLine>}
        {report.plan && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--color-muted-foreground)]">{copy.primaryGoal}</p>
                <p className="mt-1 text-base font-medium">{report.plan.primaryGoal}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.condition}</dt>
                  <dd className="mt-0.5 font-medium">{report.plan.condition || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.status}</dt>
                  <dd className="mt-0.5 font-medium">{PLAN_STATUS[report.plan.status] ?? report.plan.status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.frequency}</dt>
                  <dd className="mt-0.5 font-medium">{report.plan.frequency}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.duration}</dt>
                  <dd className="mt-0.5 font-medium">{report.plan.durationWeeks} {copy.weeks}</dd>
                </div>
              </dl>
            </div>
            {report.plan.goals.length > 0 && (
              <div className="space-y-4">
                {report.plan.goals.map((goal) => (
                  <div key={goal.title} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{goal.title}</span>
                      <span className="tabular-nums text-[var(--color-muted-foreground)]">
                        {goal.current ?? '—'} / {goal.target ?? '—'} {goal.unit ?? ''}
                        {goal.percent != null ? ` · ${goal.percent}%` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {GOAL_METRIC_LABELS[goal.metricType] ?? goal.metricType}
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)]"
                        style={{ width: `${goal.percent ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      <Section title={copy.assessments} hint={copy.assessmentsHint}>
        {!initial && !latest && <EmptyLine>{copy.emptyAssessments}</EmptyLine>}
        {(initial || latest) && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <AssessmentColumn
                title={copy.initial}
                date={initial ? formatDate(initial.at) : null}
                complaint={initial?.chiefComplaint}
                shortGoal={initial?.shortTermGoal}
                longGoal={initial?.longTermGoal}
                deficits={initial?.deficits}
                empty={!initial}
              />
              <AssessmentColumn
                title={copy.latest}
                date={latest ? formatDate(latest.at) : null}
                complaint={latest?.chiefComplaint}
                shortGoal={latest?.shortTermGoal}
                longGoal={latest?.longTermGoal}
                deficits={latest?.deficits}
                empty={!latest}
                emptyLabel={initial ? copy.noReassessment : undefined}
              />
            </div>
            {report.comparison.examRows.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.exam}</TableHead>
                    <TableHead>{copy.initial}</TableHead>
                    <TableHead>{copy.latest}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.comparison.examRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>{row.initial}</TableCell>
                      <TableCell>{row.latest}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Section>

      <Section title={copy.sessions}>
        {!attendanceTotal && <EmptyLine>{copy.emptyAppointments}</EmptyLine>}
        {attendanceTotal > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{copy.attendance}</h3>
            <div className="flex h-3 overflow-hidden rounded-full bg-[var(--color-muted)]" aria-hidden="true">
              {attendanceParts.map((part) => (
                part.value > 0 ? (
                  <div
                    key={part.label}
                    style={{ width: `${(part.value / attendanceTotal) * 100}%`, backgroundColor: part.color }}
                  />
                ) : null
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {attendanceParts.map((part) => (
                <div key={part.label}>
                  <dt className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: part.color }} aria-hidden="true" />
                    {part.label}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">{part.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">{copy.evolutions}</h3>
          {!report.evolutions.length && <EmptyLine>{copy.emptyEvolutions}</EmptyLine>}
          {report.evolutions.length > 0 && (
            <ol className="space-y-0">
              {report.evolutions.map((item) => (
                <li key={item.id} className="grid gap-1 border-t border-[var(--color-border)] py-4 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
                  <time className="text-sm font-medium tabular-nums" dateTime={item.at}>{formatDate(item.at)}</time>
                  <div className="space-y-1 text-sm">
                    {item.vitals ? <p className="text-[var(--color-muted-foreground)]">{item.vitals}</p> : null}
                    <p className="whitespace-pre-wrap">{item.conducts || '—'}</p>
                    {item.observations ? (
                      <p className="whitespace-pre-wrap text-[var(--color-muted-foreground)]">{item.observations}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Section>

      <Section title={copy.vitals} hint={copy.vitalsHint}>
        {!report.vitals.length && <EmptyLine>{copy.emptyVitals}</EmptyLine>}
        {latestVital && (
          <div>
            <h3 className="text-sm font-medium">{copy.latestVitals}</h3>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{formatDate(latestVital.at)}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {VITAL_FIELDS.map((field) => {
                const value = latestVital[field.key]
                if (typeof value !== 'number') return null
                return (
                  <div key={field.label} className="rounded-lg bg-[var(--color-muted)] px-3 py-2">
                    <dt className="text-xs text-[var(--color-muted-foreground)]">{field.label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{value}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        )}
        {report.vitals.length === 1 && <EmptyLine>{copy.needTwoPoints}</EmptyLine>}
        {firstVital && latestVital && report.vitals.length >= 2 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.vitals}</TableHead>
                <TableHead>{formatDate(firstVital.at)}</TableHead>
                <TableHead>{formatDate(latestVital.at)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VITAL_FIELDS.map((field) => {
                const start = firstVital[field.key]
                const end = latestVital[field.key]
                if (typeof start !== 'number' && typeof end !== 'number') return null
                return (
                  <TableRow key={field.label}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell className="tabular-nums">{typeof start === 'number' ? start : '—'}</TableCell>
                    <TableCell className="tabular-nums">{typeof end === 'number' ? end : '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {showPressure && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{copy.bloodPressure}</h3>
            <ChartFrame className="h-[220px]">
              <LineChart data={pressureChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="date" tick={CHART_TICK} tickLine={false} axisLine={false} />
                <YAxis width={36} tick={CHART_TICK} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="PAs" stroke="#b45309" strokeWidth={2.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="PAd" stroke="#be123c" strokeWidth={2.5} dot={false} connectNulls />
              </LineChart>
            </ChartFrame>
          </div>
        )}
        {showOther && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{copy.otherVitals}</h3>
            <ChartFrame className="h-[220px]">
              <LineChart data={otherChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="date" tick={CHART_TICK} tickLine={false} axisLine={false} />
                <YAxis width={36} tick={CHART_TICK} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="FC" stroke="#0f766e" strokeWidth={2.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="FR" stroke="#0369a1" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="SpO2" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ChartFrame>
          </div>
        )}
      </Section>

      <Section title={copy.exercises}>
        {!report.exercises.length && <EmptyLine>{copy.emptyExercises}</EmptyLine>}
        {report.exercises.length > 0 && !report.weeklyCompletions.length && (
          <EmptyLine>{copy.emptyCompletions}</EmptyLine>
        )}
        {report.weeklyCompletions.length > 0 && (
          <ChartFrame className="h-[220px]">
            <BarChart data={report.weeklyCompletions} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="week" tick={CHART_TICK} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} width={28} tick={CHART_TICK} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name={copy.completions} fill="#0369a1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
        )}
        {report.exercises.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.exercise}</TableHead>
                <TableHead>{copy.sets}</TableHead>
                <TableHead>{copy.reps}</TableHead>
                <TableHead>{copy.frequency}</TableHead>
                <TableHead>{copy.completions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.exercises.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="tabular-nums">{item.sets ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">{item.reps ?? '—'}</TableCell>
                  <TableCell>{item.frequency || '—'}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{item.completions}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Card className={cn('report-section border-dashed', !conclusion.trim() && 'print:hidden')}>
        <CardHeader>
          <CardTitle className="text-lg">{copy.conclusion}</CardTitle>
          <CardDescription className="no-print">{copy.conclusionHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="report-conclusion" className="no-print sr-only">{copy.conclusion}</Label>
          <Textarea
            id="report-conclusion"
            className="no-print min-h-32 bg-[var(--color-background)]"
            value={conclusion}
            placeholder={copy.conclusionPlaceholder}
            onChange={(event) => onConclusionChange(event.target.value)}
          />
          {conclusion.trim() ? (
            <p className="report-conclusion-print whitespace-pre-wrap text-sm leading-relaxed">{conclusion.trim()}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function AssessmentColumn({
  title,
  date,
  complaint,
  shortGoal,
  longGoal,
  deficits,
  empty,
  emptyLabel,
}: {
  title: string
  date: string | null
  complaint?: string
  shortGoal?: string
  longGoal?: string
  deficits?: string[]
  empty?: boolean
  emptyLabel?: string
}) {
  return (
    <article className="rounded-lg bg-[var(--color-muted)]/60 p-4">
      <h3 className="text-sm font-semibold">
        {title}
        {date ? <span className="font-normal text-[var(--color-muted-foreground)]"> · {date}</span> : null}
      </h3>
      {empty ? (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{emptyLabel ?? '—'}</p>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.chiefComplaint}</dt>
            <dd className="mt-0.5">{complaint || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.shortTermGoal}</dt>
            <dd className="mt-0.5">{shortGoal || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.longTermGoal}</dt>
            <dd className="mt-0.5">{longGoal || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.deficits}</dt>
            <dd className="mt-0.5">{deficits?.length ? deficits.join('; ') : copy.noDeficits}</dd>
          </div>
        </dl>
      )}
    </article>
  )
}
