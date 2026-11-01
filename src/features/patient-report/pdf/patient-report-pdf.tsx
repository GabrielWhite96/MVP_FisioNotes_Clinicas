import {
  Circle,
  Document,
  Line,
  Page,
  Polyline,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer'
import type { PatientReport, ReportVitalPoint, ScaleDelta } from '@/features/patient-report/model/build-patient-report'
import { pt } from '@/shared/config/i18n/pt'
import { CLINICAL_STATUS_LABELS, GOAL_METRIC_LABELS } from '@/shared/config/routes'
import { formatDate } from '@/shared/lib/dates'

const copy = pt.report

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 46,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  hero: {
    backgroundColor: '#0f766e',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  kicker: {
    color: '#ccfbf1',
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  patientName: {
    color: '#ffffff',
    fontSize: 18,
    marginTop: 3,
  },
  heroMeta: {
    color: '#ecfeff',
    fontSize: 9,
    marginTop: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metaItem: {
    width: '25%',
    paddingRight: 8,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 9,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#0f766e',
    marginTop: 8,
    marginBottom: 6,
  },
  muted: {
    color: '#64748b',
    fontSize: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    borderTopWidth: 3,
  },
  kpiLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  kpiValue: {
    fontSize: 12,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 4,
  },
  stat: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  statLast: {
    flex: 1,
    padding: 6,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
  },
  head: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#0f766e',
    paddingBottom: 3,
    marginBottom: 1,
  },
  cell: {
    fontSize: 8,
    paddingRight: 4,
  },
  headCell: {
    fontSize: 8,
    color: '#0f766e',
    paddingRight: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 8,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginTop: 3,
  },
  barFill: {
    height: 6,
    backgroundColor: '#0f766e',
    borderRadius: 3,
  },
  evolution: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 6,
    flexDirection: 'row',
  },
  conclusion: {
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#f0fdfa',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#64748b',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
})

export interface PatientReportPdfProps {
  patientName: string
  dateOfBirth: string | null
  clinicalStatus: string
  physioName: string
  periodLabel: string
  issuedAt: string
  report: PatientReport
  conclusion: string
}

const PLAN_STATUS: Record<string, string> = {
  active: copy.statusActive,
  completed: copy.statusCompleted,
  paused: copy.statusPaused,
  discharged: copy.statusDischarged,
}

const VITAL_FIELDS: Array<{ key: keyof ReportVitalPoint; label: string }> = [
  { key: 'hr', label: 'FC' },
  { key: 'rr', label: 'FR' },
  { key: 'spo2', label: 'SpO2' },
  { key: 'bpSystolic', label: 'PA sistólica' },
  { key: 'bpDiastolic', label: 'PA diastólica' },
  { key: 'temperature', label: 'Temp.' },
]

function formatBirthDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return formatDate(value)
}

function deltaText(scale: ScaleDelta): string {
  if (scale.first == null || scale.last == null) return '—'
  if (scale.delta == null) return String(scale.last)
  const sign = scale.delta > 0 ? `+${scale.delta}` : String(scale.delta)
  return `${scale.first} → ${scale.last} (${sign})`
}

function deltaWord(kind: 'pain' | 'up', delta: number | null): string {
  if (delta == null) return ''
  if (delta === 0) return copy.stable
  const down = delta < 0
  if (kind === 'pain') return down ? copy.decreased : copy.increased
  return down ? copy.decreased : copy.increased
}

function toneColor(kind: 'pain' | 'up', delta: number | null): string {
  if (delta == null || delta === 0) return '#94a3b8'
  const good = kind === 'pain' ? delta < 0 : delta > 0
  return good ? '#059669' : '#e11d48'
}

function reportFileSlug(patientName: string): string {
  const slug = patientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'paciente'
}

export function reportPdfFileName(patientName: string, issuedAt = new Date()): string {
  const day = issuedAt.toISOString().slice(0, 10)
  return `relatorio-${reportFileSlug(patientName)}-${day}.pdf`
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

function Empty({ children }: { children: string }) {
  return <Text style={styles.muted}>{children}</Text>
}

interface Series {
  label: string
  color: string
  values: Array<number | null>
}

function Chart({
  labels,
  series,
  yMin,
  yMax,
  height = 128,
}: {
  labels: string[]
  series: Series[]
  yMin: number
  yMax: number
  height?: number
}) {
  const width = 520
  const padL = 26
  const padR = 8
  const padT = 8
  const padB = 18
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const count = Math.max(labels.length, 1)
  const xAt = (index: number) => (count === 1 ? padL + innerW / 2 : padL + (index / (count - 1)) * innerW)
  const yAt = (value: number) => {
    const span = yMax - yMin || 1
    return padT + (1 - (value - yMin) / span) * innerH
  }
  const ticks = [yMax, (yMax + yMin) / 2, yMin]
  const labelIndexes = labels.length <= 5
    ? labels.map((_, index) => index)
    : [0, Math.floor((labels.length - 1) / 2), labels.length - 1]

  return (
    <View>
      <Svg width={width} height={height}>
        {ticks.map((tick) => (
          <Line
            key={tick}
            x1={padL}
            x2={width - padR}
            y1={yAt(tick)}
            y2={yAt(tick)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        {ticks.map((tick) => (
          <Text key={`t-${tick}`} x={0} y={yAt(tick) + 2} style={{ fontSize: 7, fill: '#64748b' }}>
            {Number.isInteger(tick) ? String(tick) : tick.toFixed(0)}
          </Text>
        ))}
        {series.map((item) => {
          const points: string[] = []
          item.values.forEach((value, index) => {
            if (value == null) return
            points.push(`${xAt(index)},${yAt(value)}`)
          })
          return points.length > 1 ? (
            <Polyline key={item.label} points={points.join(' ')} stroke={item.color} strokeWidth={1.6} fill="none" />
          ) : null
        })}
        {series.flatMap((item) => item.values.map((value, index) => (
          value == null ? null : (
            <Circle key={`${item.label}-${index}`} cx={xAt(index)} cy={yAt(value)} r={2} fill={item.color} />
          )
        )))}
        {labelIndexes.map((index) => (
          <Text key={labels[index]} x={xAt(index) - 14} y={height - 4} style={{ fontSize: 7, fill: '#64748b' }}>
            {labels[index]}
          </Text>
        ))}
      </Svg>
      <View style={styles.legend}>
        {series.map((item) => (
          <Text key={item.label} style={{ fontSize: 8, color: item.color }}>{item.label}</Text>
        ))}
      </View>
    </View>
  )
}

function Bars({ labels, values }: { labels: string[]; values: number[] }) {
  const width = 520
  const height = 110
  const padL = 26
  const padB = 18
  const max = Math.max(1, ...values)
  const slot = (width - padL - 8) / Math.max(values.length, 1)
  const barW = Math.min(18, slot * 0.55)
  return (
    <Svg width={width} height={height}>
      <Line x1={padL} x2={width - 8} y1={height - padB} y2={height - padB} stroke="#e2e8f0" strokeWidth={1} />
      {values.map((value, index) => {
        const h = (value / max) * (height - padB - 10)
        const x = padL + index * slot + (slot - barW) / 2
        const y = height - padB - h
        return <Rect key={labels[index]} x={x} y={y} width={barW} height={Math.max(h, 0)} fill="#0369a1" />
      })}
      {labels.map((label, index) => {
        const x = padL + index * slot + (slot - barW) / 2
        return (
          <Text key={label} x={x - 4} y={height - 4} style={{ fontSize: 7, fill: '#64748b' }}>{label}</Text>
        )
      })}
    </Svg>
  )
}

export function PatientReportPdf({
  patientName,
  dateOfBirth,
  clinicalStatus,
  physioName,
  periodLabel,
  issuedAt,
  report,
  conclusion,
}: PatientReportPdfProps) {
  const statusLabel = CLINICAL_STATUS_LABELS[clinicalStatus] ?? clinicalStatus
  const attendanceTotal =
    report.attendance.completed +
    report.attendance.cancelled +
    report.attendance.noShow +
    report.attendance.scheduled
  const firstVital = report.vitals[0]
  const latestVital = report.vitals[report.vitals.length - 1]
  const initial = report.comparison.initial
  const latest = report.comparison.latest

  return (
    <Document title={`Relatório clínico — ${patientName}`} author={physioName || 'Fisionotes'}>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Fisionotes · {copy.documentLabel}</Text>
          <Text style={styles.patientName}>{patientName}</Text>
          <Text style={styles.heroMeta}>{statusLabel} · {periodLabel}</Text>
        </View>

        <View style={styles.metaGrid}>
          {dateOfBirth ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{copy.dob}</Text>
              <Text style={styles.metaValue}>{formatBirthDate(dateOfBirth)}</Text>
            </View>
          ) : null}
          {physioName ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{copy.physio}</Text>
              <Text style={styles.metaValue}>{physioName}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{copy.periodLabel}</Text>
            <Text style={styles.metaValue}>{periodLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{copy.issuedAt}</Text>
            <Text style={styles.metaValue}>{issuedAt}</Text>
          </View>
        </View>

        <SectionTitle>{copy.evolutionPeriod}</SectionTitle>
        <View style={styles.kpiRow}>
          <Kpi title={copy.pain} scale={report.pain} kind="pain" />
          <Kpi title={copy.mobility} scale={report.mobility} kind="up" />
          <Kpi title={copy.confidence} scale={report.confidence} kind="up" />
        </View>

        <SectionTitle>{copy.howPatientFeels}</SectionTitle>
        <Text style={[styles.muted, { marginBottom: 4 }]}>{copy.howPatientFeelsHint}</Text>
        {!report.checkIns.length && <Empty>{copy.emptyCheckIns}</Empty>}
        {report.checkIns.length === 1 && <Empty>{copy.needTwoPoints}</Empty>}
        {report.checkIns.length >= 2 && (
          <Chart
            labels={report.checkIns.map((item) => formatDate(item.at))}
            yMin={0}
            yMax={10}
            series={[
              { label: copy.pain, color: '#be123c', values: report.checkIns.map((item) => item.pain) },
              { label: copy.mobility, color: '#0f766e', values: report.checkIns.map((item) => item.mobility) },
              { label: copy.confidence, color: '#0369a1', values: report.checkIns.map((item) => item.confidence) },
              { label: copy.difficulty, color: '#b45309', values: report.checkIns.map((item) => item.difficulty) },
            ]}
          />
        )}
        {report.checkIns.length > 0 && (
          <View>
            <View style={styles.head}>
              <Text style={[styles.headCell, { width: '16%' }]}>{copy.date}</Text>
              <Text style={[styles.headCell, { width: '12%' }]}>{copy.pain}</Text>
              <Text style={[styles.headCell, { width: '16%' }]}>{copy.mobility}</Text>
              <Text style={[styles.headCell, { width: '16%' }]}>{copy.confidence}</Text>
              <Text style={[styles.headCell, { width: '16%' }]}>{copy.difficulty}</Text>
              <Text style={[styles.headCell, { width: '24%' }]}>{copy.notes}</Text>
            </View>
            {[...report.checkIns].reverse().map((item) => (
              <View key={item.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: '16%' }]}>{formatDate(item.at)}</Text>
                <Text style={[styles.cell, { width: '12%' }]}>{item.pain ?? '—'}</Text>
                <Text style={[styles.cell, { width: '16%' }]}>{item.mobility ?? '—'}</Text>
                <Text style={[styles.cell, { width: '16%' }]}>{item.confidence ?? '—'}</Text>
                <Text style={[styles.cell, { width: '16%' }]}>{item.difficulty ?? '—'}</Text>
                <Text style={[styles.cell, { width: '24%' }]}>{item.notes || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        <SectionTitle>{copy.indicators}</SectionTitle>
        <View style={styles.statRow}>
          <Stat label={copy.sessionsDone} value={String(report.attendance.completed)} />
          <Stat label={copy.noShows} value={String(report.attendance.noShow)} />
          <Stat label={copy.adherence7} value={report.adherence7 == null ? '—' : `${report.adherence7}%`} />
          <Stat label={copy.adherence30} value={report.adherence30 == null ? '—' : `${report.adherence30}%`} />
          <Stat
            label={copy.nextEvaluation}
            value={report.nextEvaluationAt ? formatDate(report.nextEvaluationAt) : copy.noNextEvaluation}
            last
          />
        </View>

        <SectionTitle>{copy.plan}</SectionTitle>
        {!report.plan && <Empty>{copy.emptyPlan}</Empty>}
        {report.plan && (
          <View>
            <Text style={{ fontSize: 11, marginBottom: 4 }}>{report.plan.primaryGoal}</Text>
            <Text style={styles.muted}>
              {[
                report.plan.condition ? `${copy.condition}: ${report.plan.condition}` : null,
                `${copy.status}: ${PLAN_STATUS[report.plan.status] ?? report.plan.status}`,
                `${copy.frequency}: ${report.plan.frequency}`,
                `${copy.duration}: ${report.plan.durationWeeks} ${copy.weeks}`,
              ].filter(Boolean).join('  ·  ')}
            </Text>
            {report.plan.goals.map((goal) => (
              <View key={goal.title} wrap={false} style={{ marginTop: 6 }}>
                <Text>
                  {goal.title} — {goal.current ?? '—'} / {goal.target ?? '—'} {goal.unit ?? ''}
                  {goal.percent != null ? ` (${goal.percent}%)` : ''}
                </Text>
                <Text style={styles.muted}>{GOAL_METRIC_LABELS[goal.metricType] ?? goal.metricType}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${goal.percent ?? 0}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        <SectionTitle>{copy.assessments}</SectionTitle>
        <Text style={[styles.muted, { marginBottom: 4 }]}>{copy.assessmentsHint}</Text>
        {!initial && !latest && <Empty>{copy.emptyAssessments}</Empty>}
        {(initial || latest) && (
          <View style={styles.twoCol}>
            <AssessmentBlock
              title={copy.initial}
              date={initial ? formatDate(initial.at) : null}
              complaint={initial?.chiefComplaint}
              shortGoal={initial?.shortTermGoal}
              longGoal={initial?.longTermGoal}
              deficits={initial?.deficits}
              emptyLabel={initial ? undefined : '—'}
            />
            <AssessmentBlock
              title={copy.latest}
              date={latest ? formatDate(latest.at) : null}
              complaint={latest?.chiefComplaint}
              shortGoal={latest?.shortTermGoal}
              longGoal={latest?.longTermGoal}
              deficits={latest?.deficits}
              emptyLabel={latest ? undefined : (initial ? copy.noReassessment : '—')}
            />
          </View>
        )}
        {report.comparison.examRows.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <View style={styles.head}>
              <Text style={[styles.headCell, { width: '28%' }]}>{copy.exam}</Text>
              <Text style={[styles.headCell, { width: '36%' }]}>{copy.initial}</Text>
              <Text style={[styles.headCell, { width: '36%' }]}>{copy.latest}</Text>
            </View>
            {report.comparison.examRows.map((row) => (
              <View key={row.label} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: '28%' }]}>{row.label}</Text>
                <Text style={[styles.cell, { width: '36%' }]}>{row.initial}</Text>
                <Text style={[styles.cell, { width: '36%' }]}>{row.latest}</Text>
              </View>
            ))}
          </View>
        )}

        <SectionTitle>{copy.sessions}</SectionTitle>
        {!attendanceTotal && <Empty>{copy.emptyAppointments}</Empty>}
        {attendanceTotal > 0 && (
          <Text style={{ marginBottom: 4 }}>
            {copy.attendance}: {copy.attendanceCompleted} {report.attendance.completed}
            {' · '}{copy.attendanceScheduled} {report.attendance.scheduled}
            {' · '}{copy.attendanceNoShow} {report.attendance.noShow}
            {' · '}{copy.attendanceCancelled} {report.attendance.cancelled}
          </Text>
        )}
        <Text style={{ marginTop: 4, marginBottom: 2 }}>{copy.evolutions}</Text>
        {!report.evolutions.length && <Empty>{copy.emptyEvolutions}</Empty>}
        {report.evolutions.map((item) => (
          <View key={item.id} style={styles.evolution} wrap={false}>
            <Text style={{ width: 70 }}>{formatDate(item.at)}</Text>
            <View style={{ flex: 1 }}>
              {item.vitals ? <Text style={styles.muted}>{item.vitals}</Text> : null}
              <Text>{item.conducts || '—'}</Text>
              {item.observations ? <Text style={styles.muted}>{item.observations}</Text> : null}
            </View>
          </View>
        ))}

        <SectionTitle>{copy.vitals}</SectionTitle>
        <Text style={[styles.muted, { marginBottom: 4 }]}>{copy.vitalsHint}</Text>
        {!report.vitals.length && <Empty>{copy.emptyVitals}</Empty>}
        {latestVital && (
          <Text style={{ marginBottom: 4 }}>
            {copy.latestVitals} ({formatDate(latestVital.at)}):{' '}
            {VITAL_FIELDS
              .filter((field) => typeof latestVital[field.key] === 'number')
              .map((field) => `${field.label} ${latestVital[field.key]}`)
              .join(' · ') || '—'}
          </Text>
        )}
        {report.vitals.length === 1 && <Empty>{copy.needTwoPoints}</Empty>}
        {firstVital && latestVital && report.vitals.length >= 2 && (
          <View>
            <View style={styles.head}>
              <Text style={[styles.headCell, { width: '34%' }]}>{copy.vitals}</Text>
              <Text style={[styles.headCell, { width: '33%' }]}>{formatDate(firstVital.at)}</Text>
              <Text style={[styles.headCell, { width: '33%' }]}>{formatDate(latestVital.at)}</Text>
            </View>
            {VITAL_FIELDS.map((field) => {
              const start = firstVital[field.key]
              const end = latestVital[field.key]
              if (typeof start !== 'number' && typeof end !== 'number') return null
              return (
                <View key={field.label} style={styles.row} wrap={false}>
                  <Text style={[styles.cell, { width: '34%' }]}>{field.label}</Text>
                  <Text style={[styles.cell, { width: '33%' }]}>{typeof start === 'number' ? start : '—'}</Text>
                  <Text style={[styles.cell, { width: '33%' }]}>{typeof end === 'number' ? end : '—'}</Text>
                </View>
              )
            })}
          </View>
        )}
        {report.vitals.length >= 2 && (report.vitals.some((item) => item.bpSystolic != null || item.bpDiastolic != null)) && (
          <View style={{ marginTop: 6 }}>
            <Text style={{ marginBottom: 2 }}>{copy.bloodPressure}</Text>
            <Chart
              height={110}
              labels={report.vitals.map((item) => formatDate(item.at))}
              yMin={40}
              yMax={180}
              series={[
                { label: 'PAs', color: '#b45309', values: report.vitals.map((item) => item.bpSystolic) },
                { label: 'PAd', color: '#be123c', values: report.vitals.map((item) => item.bpDiastolic) },
              ]}
            />
          </View>
        )}
        {report.vitals.length >= 2 && report.vitals.some((item) => item.hr != null || item.rr != null || item.spo2 != null) && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ marginBottom: 2 }}>{copy.otherVitals}</Text>
            <Chart
              height={110}
              labels={report.vitals.map((item) => formatDate(item.at))}
              yMin={0}
              yMax={120}
              series={[
                { label: 'FC', color: '#0f766e', values: report.vitals.map((item) => item.hr) },
                { label: 'FR', color: '#0369a1', values: report.vitals.map((item) => item.rr) },
                { label: 'SpO2', color: '#7c3aed', values: report.vitals.map((item) => item.spo2) },
              ]}
            />
          </View>
        )}

        <SectionTitle>{copy.exercises}</SectionTitle>
        {!report.exercises.length && <Empty>{copy.emptyExercises}</Empty>}
        {report.exercises.length > 0 && !report.weeklyCompletions.length && <Empty>{copy.emptyCompletions}</Empty>}
        {report.weeklyCompletions.length > 0 && (
          <Bars
            labels={report.weeklyCompletions.map((item) => item.week)}
            values={report.weeklyCompletions.map((item) => item.count)}
          />
        )}
        {report.exercises.length > 0 && (
          <View>
            <View style={styles.head}>
              <Text style={[styles.headCell, { width: '34%' }]}>{copy.exercise}</Text>
              <Text style={[styles.headCell, { width: '14%' }]}>{copy.sets}</Text>
              <Text style={[styles.headCell, { width: '16%' }]}>{copy.reps}</Text>
              <Text style={[styles.headCell, { width: '18%' }]}>{copy.frequency}</Text>
              <Text style={[styles.headCell, { width: '18%' }]}>{copy.completions}</Text>
            </View>
            {report.exercises.map((item) => (
              <View key={item.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: '34%' }]}>{item.title}</Text>
                <Text style={[styles.cell, { width: '14%' }]}>{item.sets ?? '—'}</Text>
                <Text style={[styles.cell, { width: '16%' }]}>{item.reps ?? '—'}</Text>
                <Text style={[styles.cell, { width: '18%' }]}>{item.frequency || '—'}</Text>
                <Text style={[styles.cell, { width: '18%' }]}>{item.completions}</Text>
              </View>
            ))}
          </View>
        )}

        {conclusion.trim() ? (
          <View>
            <SectionTitle>{copy.conclusion}</SectionTitle>
            <View style={styles.conclusion}>
              <Text>{conclusion.trim()}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Fisionotes · {patientName}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

function Kpi({ title, scale, kind }: { title: string; scale: ScaleDelta; kind: 'pain' | 'up' }) {
  const word = deltaWord(kind, scale.delta)
  return (
    <View style={[styles.kpi, { borderTopColor: toneColor(kind, scale.delta) }]}>
      <Text style={styles.kpiLabel}>{title}</Text>
      <Text style={styles.kpiValue}>{deltaText(scale)}</Text>
      {word ? <Text style={{ fontSize: 8, color: toneColor(kind, scale.delta), marginTop: 2 }}>{word}</Text> : null}
    </View>
  )
}

function Stat({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? styles.statLast : styles.stat}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={{ fontSize: 11, marginTop: 2 }}>{value}</Text>
    </View>
  )
}

function AssessmentBlock({
  title,
  date,
  complaint,
  shortGoal,
  longGoal,
  deficits,
  emptyLabel,
}: {
  title: string
  date: string | null
  complaint?: string
  shortGoal?: string
  longGoal?: string
  deficits?: string[]
  emptyLabel?: string
}) {
  return (
    <View style={styles.card}>
      <Text style={{ fontSize: 10, marginBottom: 4 }}>
        {title}{date ? ` · ${date}` : ''}
      </Text>
      {emptyLabel ? (
        <Text style={styles.muted}>{emptyLabel}</Text>
      ) : (
        <View>
          <Text style={styles.muted}>{copy.chiefComplaint}</Text>
          <Text style={{ marginBottom: 3 }}>{complaint || '—'}</Text>
          <Text style={styles.muted}>{copy.shortTermGoal}</Text>
          <Text style={{ marginBottom: 3 }}>{shortGoal || '—'}</Text>
          <Text style={styles.muted}>{copy.longTermGoal}</Text>
          <Text style={{ marginBottom: 3 }}>{longGoal || '—'}</Text>
          <Text style={styles.muted}>{copy.deficits}</Text>
          <Text>{deficits?.length ? deficits.join('; ') : copy.noDeficits}</Text>
        </View>
      )}
    </View>
  )
}

export async function downloadPatientReportPdf(props: PatientReportPdfProps): Promise<void> {
  const blob = await pdf(<PatientReportPdf {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = reportPdfFileName(props.patientName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
