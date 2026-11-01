import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildPatientReport } from '@/features/patient-report/model/build-patient-report'
import { PatientReportDocument } from '@/features/patient-report/ui/patient-report-document'

describe('PatientReportDocument', () => {
  it('shows the patient evolution sections', () => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
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
      records: [],
      appointments: [
        { id: '1', status: 'completed', scheduled_at: '2026-10-08T12:00:00.000Z' },
      ],
      exercises: [],
      plan: null,
    })

    render(
      <PatientReportDocument
        patientName="Ana Souza"
        dateOfBirth="1990-05-10"
        clinicalStatus="in_treatment"
        physioName="Dra. Lima"
        periodLabel="Todo o tratamento"
        issuedAt="18/10/2026 14:00"
        report={report}
        conclusion=""
        onConclusionChange={() => undefined}
      />
    )

    expect(screen.getByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument()
    expect(screen.getByText('Como o paciente está')).toBeInTheDocument()
    expect(screen.getByText('Sinais vitais')).toBeInTheDocument()
    expect(screen.getByText('Avaliação inicial e reavaliação')).toBeInTheDocument()
    expect(screen.getByText('Plano e metas')).toBeInTheDocument()
    expect(screen.getByText('Sessões')).toBeInTheDocument()
    expect(screen.getByText('Exercícios')).toBeInTheDocument()
    expect(screen.getByLabelText('Conclusão')).toBeInTheDocument()
    expect(screen.getByText(/10\/05\/1990/)).toBeInTheDocument()
    expect(screen.getByText('7 → 3 (-4)')).toBeInTheDocument()
  })
})
