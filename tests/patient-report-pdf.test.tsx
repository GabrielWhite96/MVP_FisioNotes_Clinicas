import { renderToBuffer } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import { buildPatientReport } from '@/features/patient-report/model/build-patient-report'
import { PatientReportPdf, reportPdfFileName } from '@/features/patient-report/pdf/patient-report-pdf'

describe('patient report pdf', () => {
  it('names the file from the patient and the day', () => {
    expect(reportPdfFileName('Ana Souza', new Date('2026-10-18T15:00:00.000Z'))).toBe('relatorio-ana-souza-2026-10-18.pdf')
  })

  it('renders a pdf document', async () => {
    const report = buildPatientReport({
      period: 'all',
      now: new Date('2026-10-18T15:00:00.000Z'),
      adherence7: 80,
      adherence30: 60,
      checkIns: [
        {
          id: 'a',
          created_at: '2026-10-01T12:00:00.000Z',
          pain_level: 7,
          mobility_level: 4,
          confidence_level: 5,
          exercise_difficulty: 6,
          general_notes: 'início',
        },
        {
          id: 'b',
          created_at: '2026-10-15T12:00:00.000Z',
          pain_level: 3,
          mobility_level: 7,
          confidence_level: 8,
          exercise_difficulty: 4,
          general_notes: null,
        },
      ],
      records: [
        {
          id: 'evo',
          record_type: 'evolution',
          created_at: '2026-10-12T12:00:00.000Z',
          next_evaluation_at: null,
          observations: null,
          evolution: null,
          structured_data: {
            vitals: { hr: 75, rr: 15, spo2: 98, bpSystolic: 120, bpDiastolic: 80, temperature: 36.5 },
            sessionConducts: 'Ponte e marcha',
            observations: 'Sem dor ao final',
          },
        },
        {
          id: 'evo2',
          record_type: 'evolution',
          created_at: '2026-10-16T12:00:00.000Z',
          next_evaluation_at: null,
          observations: null,
          evolution: null,
          structured_data: {
            vitals: { hr: 72, rr: 14, spo2: 99, bpSystolic: 118, bpDiastolic: 76, temperature: 36.4 },
            sessionConducts: 'Fortalecimento',
            observations: '',
          },
        },
      ],
      appointments: [
        { id: '1', status: 'completed', scheduled_at: '2026-10-08T12:00:00.000Z' },
        { id: '2', status: 'no_show', scheduled_at: '2026-10-09T12:00:00.000Z' },
      ],
      exercises: [
        {
          id: 'ex',
          title: 'Ponte',
          sets: 3,
          reps: 10,
          frequency: 'diário',
          completions: [{ completed_at: '2026-10-07T15:00:00.000Z' }],
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
        ],
      },
    })

    const buffer = await renderToBuffer(
      <PatientReportPdf
        patientName="Ana Souza"
        dateOfBirth="1990-05-10"
        clinicalStatus="in_treatment"
        physioName="Dra. Lima"
        periodLabel="Todo o tratamento"
        issuedAt="18/10/2026 14:00"
        report={report}
        conclusion="Evolução favorável da dor."
      />
    )

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-')
    expect(buffer.length).toBeGreaterThan(2000)
  }, 30000)
})
