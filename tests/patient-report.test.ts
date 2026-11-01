import { describe, expect, it } from 'vitest'
import { buildPatientReport, type BuildPatientReportInput } from '@/features/patient-report/model/build-patient-report'

const now = new Date('2026-10-18T15:00:00.000Z')

function baseInput(overrides: Partial<BuildPatientReportInput> = {}): BuildPatientReportInput {
  return {
    period: '30d',
    now,
    adherence7: 80,
    adherence30: 60,
    checkIns: [],
    records: [],
    appointments: [],
    exercises: [],
    plan: null,
    ...overrides,
  }
}

describe('buildPatientReport', () => {
  it('filters check-ins by period and computes pain delta from oldest to newest', () => {
    const report = buildPatientReport(baseInput({
      checkIns: [
        {
          id: 'old',
          created_at: '2026-08-01T12:00:00.000Z',
          pain_level: 9,
          mobility_level: 2,
          confidence_level: 2,
          exercise_difficulty: 8,
          general_notes: 'fora do período',
        },
        {
          id: 'first',
          created_at: '2026-10-01T12:00:00.000Z',
          pain_level: 7,
          mobility_level: 4,
          confidence_level: 5,
          exercise_difficulty: 6,
          general_notes: 'início',
        },
        {
          id: 'last',
          created_at: '2026-10-15T12:00:00.000Z',
          pain_level: 3,
          mobility_level: 7,
          confidence_level: 8,
          exercise_difficulty: 4,
          general_notes: null,
        },
      ],
    }))

    expect(report.checkIns.map((item) => item.at)).toEqual([
      '2026-10-01T12:00:00.000Z',
      '2026-10-15T12:00:00.000Z',
    ])
    expect(report.pain).toEqual({ first: 7, last: 3, delta: -4 })
    expect(report.mobility.delta).toBe(3)
    expect(report.confidence.delta).toBe(3)
  })

  it('keeps the initial assessment outside the period and the latest reassessment inside it', () => {
    const report = buildPatientReport(baseInput({
      records: [
        {
          id: 'initial',
          record_type: 'initial_assessment',
          created_at: '2026-01-10T12:00:00.000Z',
          next_evaluation_at: '2026-11-01T12:00:00.000Z',
          observations: null,
          evolution: null,
          structured_data: {
            anamnese: { chiefComplaint: 'Dor lombar' },
            physicalExam: {
              vitals: { hr: 80, rr: 16, spo2: 98, bpSystolic: 120, bpDiastolic: 80, temperature: 36.5 },
              gaitChanges: { status: 'com_alteracao', notes: 'claudicante', items: [], values: {} },
            },
            findings: {
              shorteningsDeformities: { yes: false, detail: '' },
              muscleStrengthLoss: { yes: true, detail: 'quadríceps' },
              mobilityLoss: { yes: null, detail: '' },
            },
            therapeuticPlan: { shortTermGoal: 'Dor < 4', longTermGoal: 'Caminhar 20 min' },
          },
        },
        {
          id: 'old-re',
          record_type: 'reassessment',
          created_at: '2026-06-01T12:00:00.000Z',
          next_evaluation_at: null,
          observations: null,
          evolution: null,
          structured_data: {
            anamnese: { chiefComplaint: 'antiga' },
            physicalExam: { vitals: { hr: 70, rr: null, spo2: null, bpSystolic: null, bpDiastolic: null, temperature: null } },
            therapeuticPlan: { shortTermGoal: '', longTermGoal: '' },
          },
        },
        {
          id: 'latest',
          record_type: 'reassessment',
          created_at: '2026-10-10T12:00:00.000Z',
          next_evaluation_at: '2026-12-01T12:00:00.000Z',
          observations: null,
          evolution: null,
          structured_data: {
            anamnese: { chiefComplaint: 'Dor leve' },
            physicalExam: {
              vitals: { hr: 72, rr: 14, spo2: 99, bpSystolic: 118, bpDiastolic: 76, temperature: null },
              gaitChanges: { status: 'sem_alteracao', notes: '', items: [], values: {} },
            },
            findings: {
              shorteningsDeformities: { yes: false, detail: '' },
              muscleStrengthLoss: { yes: false, detail: '' },
              mobilityLoss: { yes: false, detail: '' },
            },
            therapeuticPlan: { shortTermGoal: 'Manter', longTermGoal: 'Alta' },
          },
        },
        {
          id: 'evo',
          record_type: 'evolution',
          created_at: '2026-10-12T12:00:00.000Z',
          next_evaluation_at: null,
          observations: 'coluna livre',
          evolution: 'texto legado',
          structured_data: {
            vitals: { hr: 75, rr: 15, spo2: 98, bpSystolic: 120, bpDiastolic: 80, temperature: null },
            sessionConducts: 'Ponte e marcha',
            observations: 'Sem dor ao final',
          },
        },
      ],
    }))

    expect(report.comparison.initial?.chiefComplaint).toBe('Dor lombar')
    expect(report.comparison.latest?.chiefComplaint).toBe('Dor leve')
    expect(report.comparison.initial?.deficits).toEqual(['Perda de força: quadríceps'])
    expect(report.comparison.examRows).toEqual([
      { label: 'Marcha', initial: 'Com alteração — claudicante', latest: 'Sem alteração' },
    ])
    expect(report.nextEvaluationAt).toBe('2026-12-01T12:00:00.000Z')
    expect(report.vitals.map((point) => point.hr)).toEqual([72, 75])
    expect(report.evolutions).toEqual([
      {
        id: 'evo',
        at: '2026-10-12T12:00:00.000Z',
        vitals: 'FC 75, FR 15, SpO2 98%, PA 120/80',
        conducts: 'Ponte e marcha',
        observations: 'Sem dor ao final',
      },
    ])
  })

  it('counts attendance and weekly exercise completions inside the period', () => {
    const report = buildPatientReport(baseInput({
      period: 'all',
      appointments: [
        { id: '1', status: 'completed', scheduled_at: '2026-10-01T12:00:00.000Z' },
        { id: '2', status: 'completed', scheduled_at: '2026-10-08T12:00:00.000Z' },
        { id: '3', status: 'no_show', scheduled_at: '2026-10-09T12:00:00.000Z' },
        { id: '4', status: 'cancelled', scheduled_at: '2026-10-10T12:00:00.000Z' },
        { id: '5', status: 'confirmed', scheduled_at: '2026-10-20T12:00:00.000Z' },
      ],
      exercises: [
        {
          id: 'ex',
          title: 'Ponte',
          sets: 3,
          reps: 10,
          frequency: 'daily',
          completions: [
            { completed_at: '2026-10-06T15:00:00.000Z' },
            { completed_at: '2026-10-07T15:00:00.000Z' },
            { completed_at: '2026-10-14T15:00:00.000Z' },
          ],
        },
      ],
      plan: {
        condition: 'Lombalgia',
        primary_goal: 'Caminhar sem dor',
        frequency: '2x por semana',
        duration_weeks: 8,
        status: 'active',
        started_at: '2026-09-01T12:00:00.000Z',
        goals: [
          { title: 'Dor', metric_type: 'pain_scale', current_value: 4, target_value: 2, unit: '/10' },
          { title: 'Marcha', metric_type: 'distance', current_value: 500, target_value: 1000, unit: 'm' },
        ],
      },
    }))

    expect(report.attendance).toEqual({ completed: 2, cancelled: 1, noShow: 1, scheduled: 1 })
    expect(report.weeklyCompletions.map((item) => item.count)).toEqual([2, 1])
    expect(report.exercises[0]?.completions).toBe(3)
    expect(report.plan?.goals.map((goal) => goal.percent)).toEqual([50, 50])
    expect(report.adherence7).toBe(80)
  })

  it('returns empty sections when the period has no events', () => {
    const report = buildPatientReport(baseInput())
    expect(report.checkIns).toEqual([])
    expect(report.pain.delta).toBeNull()
    expect(report.vitals).toEqual([])
    expect(report.evolutions).toEqual([])
    expect(report.comparison.initial).toBeNull()
    expect(report.attendance.completed).toBe(0)
    expect(report.plan).toBeNull()
  })
})
