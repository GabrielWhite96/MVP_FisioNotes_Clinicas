import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  groupOpenChargesByWeek,
  type BillingAgreement,
  type BillingCharge,
  type PatientBillingSummary,
  type PaymentReceipt,
} from '@/entities/billing/api/billing-api'
import { PatientBillingPanel } from '@/features/billing/ui/patient-billing-panel'

const api = vi.hoisted(() => ({
  getPatientBillingSummary: vi.fn(),
  upsertBillingAgreement: vi.fn(),
  registerPayment: vi.fn(),
  markChargesPaid: vi.fn(),
  markWeekPaid: vi.fn(),
  createManualCharge: vi.fn(),
  deleteReceipt: vi.fn(),
}))

vi.mock('@/entities/billing/api/billing-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/billing/api/billing-api')>()
  return {
    ...actual,
    getPatientBillingSummary: api.getPatientBillingSummary,
    upsertBillingAgreement: api.upsertBillingAgreement,
    registerPayment: api.registerPayment,
    markChargesPaid: api.markChargesPaid,
    markWeekPaid: api.markWeekPaid,
    createManualCharge: api.createManualCharge,
    deleteReceipt: api.deleteReceipt,
  }
})

function agreement(overrides: Partial<BillingAgreement> = {}): BillingAgreement {
  return {
    id: 'agr-1',
    patient_id: 'pat-1',
    physiotherapist_id: 'phy-1',
    billing_mode: 'weekly',
    session_price_cents: 15000,
    currency: 'BRL',
    preferred_method: 'pix',
    notes: null,
    is_active: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    ...overrides,
  }
}

function charge(overrides: Partial<BillingCharge> = {}): BillingCharge {
  return {
    id: 'chg-1',
    patient_id: 'pat-1',
    physiotherapist_id: 'phy-1',
    agreement_id: 'agr-1',
    appointment_id: 'apt-1',
    kind: 'session',
    description: 'Sessão',
    period_start: '2026-10-13',
    period_end: '2026-10-19',
    amount_cents: 15000,
    amount_paid_cents: 0,
    status: 'open',
    due_date: '2026-10-14',
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    appointment: {
      id: 'apt-1',
      scheduled_at: '2026-10-14T17:00:00.000Z',
      status: 'completed',
      modality: 'in_person',
    },
    ...overrides,
  }
}

function receipt(overrides: Partial<PaymentReceipt> = {}): PaymentReceipt {
  return {
    id: 'rec-1',
    patient_id: 'pat-1',
    physiotherapist_id: 'phy-1',
    amount_cents: 15000,
    method: 'pix',
    paid_at: '2026-10-14T18:00:00.000Z',
    note: null,
    created_at: '2026-10-14T18:00:00.000Z',
    updated_at: '2026-10-14T18:00:00.000Z',
    ...overrides,
  }
}

function summary(overrides: Partial<PatientBillingSummary> = {}): PatientBillingSummary {
  const charges = overrides.charges ?? [charge()]
  const receipts = overrides.receipts ?? []
  const active = charges.filter((item) => item.status !== 'waived')
  const expectedCents = active.reduce((sum, item) => sum + item.amount_cents, 0)
  const paidCents = active.reduce((sum, item) => sum + item.amount_paid_cents, 0)
  return {
    agreement: agreement(),
    charges,
    receipts,
    expectedCents,
    paidCents,
    balanceCents: expectedCents - paidCents,
    openChargesCount: charges.filter((item) => item.status === 'open' || item.status === 'partial').length,
    ...overrides,
  }
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PatientBillingPanel patientId="pat-1" physiotherapistId="phy-1" />
    </QueryClientProvider>
  )
}

describe('groupOpenChargesByWeek', () => {
  it('groups only unpaid charges by week', () => {
    const groups = groupOpenChargesByWeek([
      charge({ id: 'a', due_date: '2026-10-14', status: 'open' }),
      charge({ id: 'b', due_date: '2026-10-16', status: 'partial', amount_paid_cents: 5000 }),
      charge({ id: 'c', due_date: '2026-10-21', status: 'open' }),
      charge({ id: 'd', due_date: '2026-10-14', status: 'paid', amount_paid_cents: 15000 }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].weekOf).toBe('2026-10-12')
    expect(groups[0].charges.map((item) => item.id)).toEqual(['a', 'b'])
    expect(groups[1].weekOf).toBe('2026-10-19')
  })
})

describe('patient billing panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks only for the session price before anything else', async () => {
    api.getPatientBillingSummary.mockResolvedValue(summary({ agreement: null, charges: [], receipts: [] }))
    renderPanel()

    expect(await screen.findByRole('heading', { name: 'Valor da sessão' })).toBeInTheDocument()
    expect(screen.getByText(/defina quanto este paciente paga/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Quanto cobra por sessão?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar valor da sessão' })).toBeInTheDocument()
    expect(screen.queryByText(/acordo padrão/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/pagamento picado/i)).not.toBeInTheDocument()
  })

  it('shows what is owed and lets the physio mark a session as paid', async () => {
    const user = userEvent.setup()
    api.getPatientBillingSummary.mockResolvedValue(
      summary({
        charges: [
          charge({ id: 'chg-1', due_date: '2026-10-14' }),
          charge({
            id: 'chg-2',
            due_date: '2026-10-16',
            appointment_id: 'apt-2',
            appointment: {
              id: 'apt-2',
              scheduled_at: '2026-10-16T13:00:00.000Z',
              status: 'scheduled',
              modality: 'in_person',
            },
          }),
        ],
      })
    )
    api.markChargesPaid.mockResolvedValue({ receipt: receipt(), amountCents: 15000 })
    renderPanel()

    expect(await screen.findByText('Falta receber')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeInTheDocument()
    expect(screen.getByText('A receber')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recebi a semana' })).toBeInTheDocument()
    expect(screen.queryByText(/registrar e debitar/i)).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /^Recebi Sessão/ })[0])
    expect(api.markChargesPaid).toHaveBeenCalledWith(
      expect.objectContaining({ chargeIds: ['chg-1'], method: 'pix' })
    )
  })

  it('opens a single payment dialog instead of a permanent extra form', async () => {
    const user = userEvent.setup()
    api.getPatientBillingSummary.mockResolvedValue(summary())
    api.registerPayment.mockResolvedValue(receipt())
    renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Registrar pagamento' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Registrar pagamento' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Quanto recebeu')).toHaveValue(150)
    expect(within(dialog).queryByText(/picado/i)).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Registrar pagamento' }))
    expect(api.registerPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 15000, method: 'pix' })
    )
  })

  it('adds an extra charge through a dialog, not a browser prompt', async () => {
    const user = userEvent.setup()
    const prompt = vi.spyOn(window, 'prompt')
    api.getPatientBillingSummary.mockResolvedValue(summary({ charges: [], balanceCents: 0, openChargesCount: 0 }))
    api.createManualCharge.mockResolvedValue(charge({ kind: 'manual', description: 'Deslocamento' }))
    renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Cobrança extra' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Valor'), '40')
    await user.type(within(dialog).getByLabelText('O que é (opcional)'), 'Deslocamento')
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar cobrança' }))

    expect(prompt).not.toHaveBeenCalled()
    expect(api.createManualCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 4000,
        description: 'Deslocamento',
      })
    )
  })
})
