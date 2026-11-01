import { renderToBuffer } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import { CLINIC_FORMS } from '@/features/clinical-forms/model/catalog'
import { BlankClinicFormPdf, clinicFormFileName } from '@/features/clinical-forms/pdf/blank-form-pdf'
import { AssignmentReportPdf, assignmentReportFileName } from '@/features/assignment-report/pdf/assignment-report-pdf'

describe('clinic printable PDFs', () => {
  it('names ficha files from the slug and day', () => {
    expect(clinicFormFileName(CLINIC_FORMS[0], new Date('2026-10-31T15:00:00.000Z')))
      .toBe('ficha-avaliacao-inicial-2026-10-31.pdf')
  })

  it('renders every blank form', async () => {
    for (const form of CLINIC_FORMS) {
      const buffer = await renderToBuffer(<BlankClinicFormPdf form={form} />)
      expect(buffer.byteLength).toBeGreaterThan(100)
    }
  })

  it('renders assignment reports for patient and staff', async () => {
    const rows = [
      {
        id: '1',
        name: 'Ana Souza',
        startedOn: '2026-01-10',
        endedOn: '2026-03-15',
        weekdayLabel: 'Ter',
        timesLabel: '09:00',
        sessionCount: 8,
        sessions: [{ id: 's1', scheduledAt: '2026-01-13T12:00:00.000Z' }],
      },
      {
        id: '2',
        name: 'Ana Souza',
        startedOn: '2026-03-15',
        endedOn: null,
        weekdayLabel: 'Qui',
        timesLabel: '14:00',
        sessionCount: 4,
        sessions: [{ id: 's2', scheduledAt: '2026-03-19T17:00:00.000Z' }],
      },
    ]
    const patientPdf = await renderToBuffer(
      <AssignmentReportPdf
        kind="patient"
        subjectName="João Lima"
        periodLabel="Todo o tratamento"
        issuedAt="31/10/2026"
        rows={rows}
      />,
    )
    const staffPdf = await renderToBuffer(
      <AssignmentReportPdf
        kind="staff"
        subjectName="Ana Souza"
        periodLabel="Últimos 30 dias"
        issuedAt="31/10/2026"
        rows={[{
          id: '1',
          name: 'João Lima',
          startedOn: '2026-03-15',
          endedOn: null,
          weekdayLabel: 'Ter',
          timesLabel: '09:00',
          sessionCount: 2,
          sessions: [{ id: 's1', scheduledAt: '2026-03-17T12:00:00.000Z' }],
        }]}
      />,
    )
    expect(patientPdf.byteLength).toBeGreaterThan(100)
    expect(staffPdf.byteLength).toBeGreaterThan(100)
    expect(assignmentReportFileName('patient', 'João Lima', new Date('2026-10-31T12:00:00.000Z')))
      .toMatch(/^atendimentos-paciente-joao-lima-2026-10-31\.pdf$/)
  })
})
