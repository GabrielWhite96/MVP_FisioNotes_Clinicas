import { format, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AssessmentStructuredData, PhysicalExamFindingKey } from '@/entities/clinical-record/model/assessment-schema'
import type { EvolutionStructuredData } from '@/entities/clinical-record/model/evolution-schema'
import { EXAM_STATUS_OPTIONS } from '@/entities/clinical-record/model/exam-status'
import { extractDeficitSummary, formatSessionConductsText } from '@/entities/clinical-record/model/summaries'
import type { VitalSigns } from '@/entities/clinical-record/model/vital-signs'

export type ReportPeriod = '30d' | '90d' | 'all'

export interface ReportCheckInInput {
  id: string
  created_at: string
  pain_level: number | null
  mobility_level: number | null
  confidence_level: number | null
  exercise_difficulty: number | null
  general_notes: string | null
}

export interface ReportRecordInput {
  id: string
  record_type: 'initial_assessment' | 'evolution' | 'reassessment'
  structured_data: Record<string, unknown> | null
  created_at: string
  next_evaluation_at: string | null
  observations: string | null
  evolution: string | null
}

export interface ReportAppointmentInput {
  id: string
  status: string
  scheduled_at: string
}

export interface ReportExerciseInput {
  id: string
  title: string
  sets: number | null
  reps: number | null
  frequency: string | null
  completions: { completed_at: string }[]
}

export interface ReportGoalInput {
  title: string
  metric_type: string
  current_value: number | null
  target_value: number | null
  unit: string | null
}

export interface ReportPlanInput {
  condition: string | null
  primary_goal: string
  frequency: string
  duration_weeks: number
  status: string
  started_at: string
  goals: ReportGoalInput[]
}

export interface BuildPatientReportInput {
  period: ReportPeriod
  now: Date
  adherence7: number | null
  adherence30: number | null
  checkIns: ReportCheckInInput[]
  records: ReportRecordInput[]
  appointments: ReportAppointmentInput[]
  exercises: ReportExerciseInput[]
  plan: ReportPlanInput | null
}

export interface ScaleDelta {
  first: number | null
  last: number | null
  delta: number | null
}

export interface ReportCheckInPoint {
  id: string
  at: string
  pain: number | null
  mobility: number | null
  confidence: number | null
  difficulty: number | null
  notes: string | null
}

export interface ReportVitalPoint {
  at: string
  hr: number | null
  rr: number | null
  spo2: number | null
  bpSystolic: number | null
  bpDiastolic: number | null
  temperature: number | null
}

export interface AssessmentSnapshot {
  at: string
  recordType: 'initial_assessment' | 'reassessment'
  chiefComplaint: string
  shortTermGoal: string
  longTermGoal: string
  deficits: string[]
}

export interface PatientReport {
  checkIns: ReportCheckInPoint[]
  pain: ScaleDelta
  mobility: ScaleDelta
  confidence: ScaleDelta
  vitals: ReportVitalPoint[]
  comparison: {
    initial: AssessmentSnapshot | null
    latest: AssessmentSnapshot | null
    examRows: Array<{ label: string; initial: string; latest: string }>
  }
  nextEvaluationAt: string | null
  attendance: {
    completed: number
    cancelled: number
    noShow: number
    scheduled: number
  }
  evolutions: Array<{
    id: string
    at: string
    vitals: string
    conducts: string
    observations: string
  }>
  plan: {
    condition: string | null
    primaryGoal: string
    frequency: string
    durationWeeks: number
    status: string
    startedAt: string
    goals: Array<{
      title: string
      metricType: string
      current: number | null
      target: number | null
      unit: string | null
      percent: number | null
    }>
  } | null
  exercises: Array<{
    id: string
    title: string
    sets: number | null
    reps: number | null
    frequency: string | null
    completions: number
  }>
  weeklyCompletions: Array<{ week: string; count: number }>
  adherence7: number | null
  adherence30: number | null
}

const EXAM_FIELDS: Array<{ key: PhysicalExamFindingKey; label: string }> = [
  { key: 'ausculta', label: 'Ausculta' },
  { key: 'mrc', label: 'MRC' },
  { key: 'goniometria', label: 'Goniometria' },
  { key: 'posturalChanges', label: 'Postura' },
  { key: 'gaitChanges', label: 'Marcha' },
  { key: 'superficialReflexes', label: 'Reflexos superficiais' },
  { key: 'deepReflexes', label: 'Reflexos profundos' },
  { key: 'staticBalance', label: 'Equilíbrio estático' },
  { key: 'dynamicBalance', label: 'Equilíbrio dinâmico' },
  { key: 'specialTests', label: 'Testes especiais' },
]

function periodStartMs(period: ReportPeriod, now: Date): number | null {
  if (period === 'all') return null
  const days = period === '30d' ? 30 : 90
  return now.getTime() - days * 24 * 60 * 60 * 1000
}

function inPeriod(iso: string, startMs: number | null): boolean {
  if (startMs == null) return true
  const time = parseISO(iso).getTime()
  return Number.isFinite(time) && time >= startMs
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readVitals(data: Record<string, unknown> | null): VitalSigns | null {
  if (!data) return null
  const direct = isRecord(data.vitals) ? data.vitals : null
  const exam = isRecord(data.physicalExam) ? data.physicalExam : null
  const nested = exam && isRecord(exam.vitals) ? exam.vitals : null
  const source = direct ?? nested
  if (!source) return null
  return {
    hr: num(source.hr),
    rr: num(source.rr),
    spo2: num(source.spo2),
    bpSystolic: num(source.bpSystolic),
    bpDiastolic: num(source.bpDiastolic),
    temperature: num(source.temperature),
  }
}

function hasVital(vitals: VitalSigns): boolean {
  return (
    vitals.hr != null ||
    vitals.rr != null ||
    vitals.spo2 != null ||
    vitals.bpSystolic != null ||
    vitals.bpDiastolic != null ||
    vitals.temperature != null
  )
}

export function formatVitalsShort(vitals: VitalSigns | null): string {
  if (!vitals || !hasVital(vitals)) return ''
  const parts: string[] = []
  if (vitals.hr != null) parts.push(`FC ${vitals.hr}`)
  if (vitals.rr != null) parts.push(`FR ${vitals.rr}`)
  if (vitals.spo2 != null) parts.push(`SpO2 ${vitals.spo2}%`)
  if (vitals.bpSystolic != null || vitals.bpDiastolic != null) {
    parts.push(`PA ${vitals.bpSystolic ?? '—'}/${vitals.bpDiastolic ?? '—'}`)
  }
  if (vitals.temperature != null) parts.push(`Temp ${vitals.temperature}°C`)
  return parts.join(', ')
}

function scaleDelta(values: Array<number | null>): ScaleDelta {
  const present = values.filter((value): value is number => value != null)
  if (!present.length) return { first: null, last: null, delta: null }
  if (present.length === 1) return { first: present[0], last: present[0], delta: null }
  const first = present[0]
  const last = present[present.length - 1]
  return { first, last, delta: last - first }
}

function asAssessment(data: Record<string, unknown> | null): AssessmentStructuredData | null {
  if (!data || !isRecord(data.anamnese) || !isRecord(data.physicalExam)) return null
  return data as unknown as AssessmentStructuredData
}

function asEvolution(data: Record<string, unknown> | null): EvolutionStructuredData | null {
  if (!data) return null
  if (!('vitals' in data) && !('sessionConducts' in data) && !('observations' in data) && !('performed' in data)) {
    return null
  }
  return data as unknown as EvolutionStructuredData
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function findingText(finding: { status?: string; notes?: string } | undefined): string {
  if (!finding?.status) return ''
  const label = EXAM_STATUS_OPTIONS.find((option) => option.value === finding.status)?.label ?? finding.status
  const notes = text(finding.notes)
  if (finding.status === 'nao_avaliado' && !notes) return ''
  return notes ? `${label} — ${notes}` : label
}

function snapshot(record: ReportRecordInput): AssessmentSnapshot | null {
  const data = asAssessment(record.structured_data)
  if (!data || (record.record_type !== 'initial_assessment' && record.record_type !== 'reassessment')) return null
  const deficits = data.findings ? extractDeficitSummary(data) : []
  return {
    at: record.created_at,
    recordType: record.record_type,
    chiefComplaint: text(data.anamnese?.chiefComplaint),
    shortTermGoal: text(data.therapeuticPlan?.shortTermGoal),
    longTermGoal: text(data.therapeuticPlan?.longTermGoal),
    deficits,
  }
}

function examMap(record: ReportRecordInput | undefined): Map<string, string> {
  const map = new Map<string, string>()
  if (!record) return map
  const data = asAssessment(record.structured_data)
  if (!data?.physicalExam) return map
  for (const field of EXAM_FIELDS) {
    const finding = data.physicalExam[field.key]
    const value = findingText(finding)
    if (value) map.set(field.label, value)
  }
  return map
}

function goalPercent(metric: string, current: number | null, target: number | null): number | null {
  if (current == null || target == null || target === 0) return null
  if (metric === 'pain_scale') {
    if (current <= target) return 100
    return Math.round((target / current) * 100)
  }
  return Math.min(100, Math.round((current / target) * 100))
}

export function buildPatientReport(input: BuildPatientReportInput): PatientReport {
  const startMs = periodStartMs(input.period, input.now)
  const byDate = (a: { created_at?: string; scheduled_at?: string; at?: string }, b: typeof a) => {
    const left = a.created_at ?? a.scheduled_at ?? a.at ?? ''
    const right = b.created_at ?? b.scheduled_at ?? b.at ?? ''
    return left.localeCompare(right)
  }

  const checkIns = input.checkIns
    .filter((item) => inPeriod(item.created_at, startMs))
    .sort(byDate)
    .map((item) => ({
      id: item.id,
      at: item.created_at,
      pain: item.pain_level,
      mobility: item.mobility_level,
      confidence: item.confidence_level,
      difficulty: item.exercise_difficulty,
      notes: item.general_notes?.trim() || null,
    }))

  const recordsInPeriod = input.records.filter((record) => inPeriod(record.created_at, startMs))

  const vitals = recordsInPeriod
    .map((record) => {
      const value = readVitals(record.structured_data)
      if (!value || !hasVital(value)) return null
      return { at: record.created_at, ...value }
    })
    .filter((point): point is ReportVitalPoint => point != null)
    .sort((a, b) => a.at.localeCompare(b.at))

  const assessments = input.records
    .filter((record) => record.record_type === 'initial_assessment' || record.record_type === 'reassessment')
    .sort(byDate)
  const initialRecord = assessments.find((record) => record.record_type === 'initial_assessment') ?? null
  const latestRecord = [...assessments]
    .reverse()
    .find((record) => record.record_type === 'reassessment' && inPeriod(record.created_at, startMs) && record.id !== initialRecord?.id) ?? null

  const initialExams = examMap(initialRecord ?? undefined)
  const latestExams = examMap(latestRecord ?? undefined)
  const examLabels = [...new Set([...initialExams.keys(), ...latestExams.keys()])]

  const nextEvaluationAt = [...assessments]
    .reverse()
    .map((record) => record.next_evaluation_at)
    .find((value) => Boolean(value)) ?? null

  const appointments = input.appointments.filter((item) => inPeriod(item.scheduled_at, startMs))
  const attendance = {
    completed: appointments.filter((item) => item.status === 'completed').length,
    cancelled: appointments.filter((item) => item.status === 'cancelled').length,
    noShow: appointments.filter((item) => item.status === 'no_show').length,
    scheduled: appointments.filter((item) => item.status === 'scheduled' || item.status === 'confirmed').length,
  }

  const evolutions = recordsInPeriod
    .filter((record) => record.record_type === 'evolution')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((record) => {
      const structured = asEvolution(record.structured_data)
      const conducts = structured ? formatSessionConductsText(structured) : ''
      return {
        id: record.id,
        at: record.created_at,
        vitals: formatVitalsShort(readVitals(record.structured_data)),
        conducts: conducts || record.evolution?.trim() || '',
        observations: text(structured?.observations) || record.observations?.trim() || '',
      }
    })

  const weekCounts = new Map<string, { week: string; count: number }>()
  for (const exercise of input.exercises) {
    for (const completion of exercise.completions) {
      if (!inPeriod(completion.completed_at, startMs)) continue
      const start = startOfWeek(parseISO(completion.completed_at), { weekStartsOn: 1 })
      const key = format(start, 'yyyy-MM-dd')
      const current = weekCounts.get(key)
      if (current) current.count += 1
      else weekCounts.set(key, { week: format(start, 'dd/MM/yy', { locale: ptBR }), count: 1 })
    }
  }

  return {
    checkIns,
    pain: scaleDelta(checkIns.map((item) => item.pain)),
    mobility: scaleDelta(checkIns.map((item) => item.mobility)),
    confidence: scaleDelta(checkIns.map((item) => item.confidence)),
    vitals,
    comparison: {
      initial: initialRecord ? snapshot(initialRecord) : null,
      latest: latestRecord ? snapshot(latestRecord) : null,
      examRows: examLabels.map((label) => ({
        label,
        initial: initialExams.get(label) ?? '—',
        latest: latestExams.get(label) ?? '—',
      })),
    },
    nextEvaluationAt,
    attendance,
    evolutions,
    plan: input.plan
      ? {
          condition: input.plan.condition,
          primaryGoal: input.plan.primary_goal,
          frequency: input.plan.frequency,
          durationWeeks: input.plan.duration_weeks,
          status: input.plan.status,
          startedAt: input.plan.started_at,
          goals: input.plan.goals.map((goal) => ({
            title: goal.title,
            metricType: goal.metric_type,
            current: goal.current_value,
            target: goal.target_value,
            unit: goal.unit,
            percent: goalPercent(goal.metric_type, goal.current_value, goal.target_value),
          })),
        }
      : null,
    exercises: input.exercises.map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      sets: exercise.sets,
      reps: exercise.reps,
      frequency: exercise.frequency,
      completions: exercise.completions.filter((item) => inPeriod(item.completed_at, startMs)).length,
    })),
    weeklyCompletions: [...weekCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value),
    adherence7: input.adherence7,
    adherence30: input.adherence30,
  }
}
