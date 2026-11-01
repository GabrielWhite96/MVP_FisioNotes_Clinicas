import { supabase } from '@/shared/api/supabase'

export type BillingMode = 'per_session' | 'weekly'
export type PaymentMethodKind = 'pix' | 'cash' | 'other'
export type BillingChargeKind = 'session' | 'manual' | 'adjustment'
export type BillingChargeStatus = 'open' | 'partial' | 'paid' | 'waived'

export interface BillingAgreement {
  id: string
  patient_id: string
  physiotherapist_id: string
  billing_mode: BillingMode
  session_price_cents: number
  currency: string
  preferred_method: PaymentMethodKind | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BillingCharge {
  id: string
  patient_id: string
  physiotherapist_id: string
  agreement_id: string | null
  appointment_id: string | null
  kind: BillingChargeKind
  description: string | null
  period_start: string | null
  period_end: string | null
  amount_cents: number
  amount_paid_cents: number
  status: BillingChargeStatus
  due_date: string | null
  created_at: string
  updated_at: string
  appointment?: {
    id: string
    scheduled_at: string
    status: string
    modality: string
  } | null
}

export interface PaymentReceipt {
  id: string
  patient_id: string
  physiotherapist_id: string
  amount_cents: number
  method: PaymentMethodKind
  paid_at: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface PatientBillingSummary {
  agreement: BillingAgreement | null
  charges: BillingCharge[]
  receipts: PaymentReceipt[]
  expectedCents: number
  paidCents: number
  balanceCents: number
  openChargesCount: number
}

export interface PhysioBillingOverviewRow {
  patientId: string
  patientName: string
  agreement: BillingAgreement | null
  expectedCents: number
  paidCents: number
  balanceCents: number
  openChargesCount: number
  currency: string
}

function toDateOnly(isoOrDate: string): string {
  return isoOrDate.slice(0, 10)
}

/** Monday of the ISO week for a date string (YYYY-MM-DD or ISO datetime). */
export function weekStartOf(dateLike: string): string {
  const d = new Date(`${toDateOnly(dateLike)}T12:00:00`)
  const day = d.getDay() // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function weekEndOf(dateLike: string): string {
  const start = new Date(`${weekStartOf(dateLike)}T12:00:00`)
  start.setDate(start.getDate() + 6)
  return start.toISOString().slice(0, 10)
}

export function chargeRemainingCents(charge: BillingCharge): number {
  return Math.max(0, charge.amount_cents - charge.amount_paid_cents)
}

function summarize(
  agreement: BillingAgreement | null,
  charges: BillingCharge[],
  receipts: PaymentReceipt[]
): PatientBillingSummary {
  const active = charges.filter((c) => c.status !== 'waived')
  const expectedCents = active.reduce((sum, c) => sum + c.amount_cents, 0)
  const paidCents = active.reduce((sum, c) => sum + c.amount_paid_cents, 0)
  return {
    agreement,
    charges,
    receipts,
    expectedCents,
    paidCents,
    balanceCents: expectedCents - paidCents,
    openChargesCount: charges.filter((c) => c.status === 'open' || c.status === 'partial').length,
  }
}

export async function getActiveBillingAgreement(patientId: string): Promise<BillingAgreement | null> {
  const { data, error } = await supabase
    .from('patient_billing_agreements')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return (data as BillingAgreement | null) ?? null
}

export async function upsertBillingAgreement(input: {
  patientId: string
  physiotherapistId: string
  billingMode: BillingMode
  sessionPriceCents: number
  currency?: string
  preferredMethod?: PaymentMethodKind | null
  notes?: string | null
}): Promise<BillingAgreement> {
  const existing = await getActiveBillingAgreement(input.patientId)
  if (existing) {
    const { data, error } = await supabase
      .from('patient_billing_agreements')
      .update({
        billing_mode: input.billingMode,
        session_price_cents: input.sessionPriceCents,
        currency: input.currency ?? existing.currency,
        preferred_method: input.preferredMethod ?? null,
        notes: input.notes ?? null,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data as BillingAgreement
  }

  const { data, error } = await supabase
    .from('patient_billing_agreements')
    .insert({
      patient_id: input.patientId,
      physiotherapist_id: input.physiotherapistId,
      billing_mode: input.billingMode,
      session_price_cents: input.sessionPriceCents,
      currency: input.currency ?? 'BRL',
      preferred_method: input.preferredMethod ?? null,
      notes: input.notes ?? null,
      is_active: true,
    })
    .select()
    .single()
  if (error) throw error
  return data as BillingAgreement
}

export async function getBillingCharges(patientId: string): Promise<BillingCharge[]> {
  const { data, error } = await supabase
    .from('patient_billing_charges')
    .select(`
      *,
      appointment:appointments(id, scheduled_at, status, modality)
    `)
    .eq('patient_id', patientId)
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as BillingCharge[]
}

export async function getPaymentReceipts(patientId: string): Promise<PaymentReceipt[]> {
  const { data, error } = await supabase
    .from('patient_payment_receipts')
    .select('*')
    .eq('patient_id', patientId)
    .order('paid_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PaymentReceipt[]
}

export async function getPatientBillingSummary(patientId: string): Promise<PatientBillingSummary> {
  const [agreement, charges, receipts] = await Promise.all([
    getActiveBillingAgreement(patientId),
    getBillingCharges(patientId),
    getPaymentReceipts(patientId),
  ])
  return summarize(agreement, charges, receipts)
}

/**
 * Create missing session charges from billable appointments using the active agreement price.
 * Billable = not cancelled / no_show. Uses appointment.price_cents when set, else agreement price.
 */
export async function syncSessionCharges(input: {
  patientId: string
  physiotherapistId: string
}): Promise<{ created: number }> {
  const agreement = await getActiveBillingAgreement(input.patientId)
  if (!agreement) {
    throw new Error('Defina o acordo de pagamento do paciente antes de sincronizar sessões.')
  }

  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id, scheduled_at, status, price_cents, modality')
    .eq('patient_id', input.patientId)
    .eq('physiotherapist_id', input.physiotherapistId)
    .in('status', ['scheduled', 'confirmed', 'completed'])
    .order('scheduled_at', { ascending: true })
  if (apptError) throw apptError

  const { data: existing, error: existingError } = await supabase
    .from('patient_billing_charges')
    .select('appointment_id')
    .eq('patient_id', input.patientId)
    .eq('kind', 'session')
    .not('appointment_id', 'is', null)
  if (existingError) throw existingError

  const have = new Set((existing ?? []).map((r) => r.appointment_id as string))
  const toInsert = (appointments ?? [])
    .filter((a) => !have.has(a.id))
    .map((a) => {
      const day = toDateOnly(a.scheduled_at)
      const amount = a.price_cents ?? agreement.session_price_cents
      return {
        patient_id: input.patientId,
        physiotherapist_id: input.physiotherapistId,
        agreement_id: agreement.id,
        appointment_id: a.id,
        kind: 'session' as const,
        description: `Sessão ${new Date(a.scheduled_at).toLocaleString('pt-BR')}`,
        period_start: weekStartOf(day),
        period_end: weekEndOf(day),
        amount_cents: amount,
        amount_paid_cents: 0,
        status: 'open' as const,
        due_date: day,
      }
    })

  if (!toInsert.length) return { created: 0 }

  const { error: insertError } = await supabase.from('patient_billing_charges').insert(toInsert)
  if (insertError) throw insertError
  return { created: toInsert.length }
}

export async function createManualCharge(input: {
  patientId: string
  physiotherapistId: string
  amountCents: number
  description?: string
  dueDate?: string
}): Promise<BillingCharge> {
  const agreement = await getActiveBillingAgreement(input.patientId)
  const due = input.dueDate ?? new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('patient_billing_charges')
    .insert({
      patient_id: input.patientId,
      physiotherapist_id: input.physiotherapistId,
      agreement_id: agreement?.id ?? null,
      kind: 'manual',
      description: input.description ?? 'Cobrança manual',
      period_start: weekStartOf(due),
      period_end: weekEndOf(due),
      amount_cents: input.amountCents,
      amount_paid_cents: 0,
      status: 'open',
      due_date: due,
    })
    .select()
    .single()
  if (error) throw error
  return data as BillingCharge
}

export async function waiveCharge(chargeId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_billing_charges')
    .update({ status: 'waived' })
    .eq('id', chargeId)
  if (error) throw error
}

async function allocateFifo(
  receiptId: string,
  charges: BillingCharge[],
  amountCents: number
): Promise<number> {
  let remaining = amountCents
  for (const charge of charges) {
    if (remaining <= 0) break
    const open = chargeRemainingCents(charge)
    if (open <= 0) continue
    const take = Math.min(open, remaining)
    const { error } = await supabase.from('patient_payment_allocations').insert({
      receipt_id: receiptId,
      charge_id: charge.id,
      amount_cents: take,
    })
    if (error) throw error
    remaining -= take
  }
  return amountCents - remaining
}

async function createReceiptAndAllocate(input: {
  patientId: string
  physiotherapistId: string
  amountCents: number
  method: PaymentMethodKind
  paidAt?: string
  note?: string
  chargeIds?: string[]
}): Promise<PaymentReceipt> {
  if (input.amountCents <= 0) throw new Error('Informe um valor maior que zero.')

  const { data: receipt, error } = await supabase
    .from('patient_payment_receipts')
    .insert({
      patient_id: input.patientId,
      physiotherapist_id: input.physiotherapistId,
      amount_cents: input.amountCents,
      method: input.method,
      paid_at: input.paidAt ?? new Date().toISOString(),
      note: input.note ?? null,
    })
    .select()
    .single()
  if (error) throw error

  const allCharges = await getBillingCharges(input.patientId)
  const targets = (
    input.chargeIds?.length
      ? allCharges.filter((c) => input.chargeIds!.includes(c.id))
      : allCharges.filter((c) => c.status === 'open' || c.status === 'partial')
  ).sort((a, b) => {
    const da = a.due_date ?? a.created_at
    const db = b.due_date ?? b.created_at
    return da.localeCompare(db)
  })

  await allocateFifo(receipt.id, targets, input.amountCents)
  return receipt as PaymentReceipt
}

/** Register a partial / late / ad-hoc payment and debit oldest open charges (FIFO). */
export async function registerPayment(input: {
  patientId: string
  physiotherapistId: string
  amountCents: number
  method: PaymentMethodKind
  paidAt?: string
  note?: string
  chargeIds?: string[]
}): Promise<PaymentReceipt> {
  return createReceiptAndAllocate(input)
}

/** Mark all open/partial charges in a calendar week as paid (full remaining balance). */
export async function markWeekPaid(input: {
  patientId: string
  physiotherapistId: string
  weekOf: string
  method: PaymentMethodKind
  paidAt?: string
  note?: string
}): Promise<{ receipt: PaymentReceipt | null; amountCents: number; chargesCount: number }> {
  const start = weekStartOf(input.weekOf)
  const end = weekEndOf(input.weekOf)
  const charges = (await getBillingCharges(input.patientId)).filter((c) => {
    if (!(c.status === 'open' || c.status === 'partial')) return false
    const day = c.due_date ?? c.period_start
    if (!day) return false
    return day >= start && day <= end
  })

  const amountCents = charges.reduce((sum, c) => sum + chargeRemainingCents(c), 0)
  if (amountCents <= 0) {
    return { receipt: null, amountCents: 0, chargesCount: 0 }
  }

  const receipt = await createReceiptAndAllocate({
    patientId: input.patientId,
    physiotherapistId: input.physiotherapistId,
    amountCents,
    method: input.method,
    paidAt: input.paidAt,
    note: input.note ?? `Semana ${start} a ${end} paga`,
    chargeIds: charges.map((c) => c.id),
  })

  return { receipt, amountCents, chargesCount: charges.length }
}

/** Pay remaining balance of specific charges (e.g. one session). */
export async function markChargesPaid(input: {
  patientId: string
  physiotherapistId: string
  chargeIds: string[]
  method: PaymentMethodKind
  paidAt?: string
  note?: string
}): Promise<{ receipt: PaymentReceipt | null; amountCents: number }> {
  const charges = (await getBillingCharges(input.patientId)).filter((c) =>
    input.chargeIds.includes(c.id)
  )
  const amountCents = charges.reduce((sum, c) => sum + chargeRemainingCents(c), 0)
  if (amountCents <= 0) return { receipt: null, amountCents: 0 }

  const receipt = await createReceiptAndAllocate({
    patientId: input.patientId,
    physiotherapistId: input.physiotherapistId,
    amountCents,
    method: input.method,
    paidAt: input.paidAt,
    note: input.note,
    chargeIds: input.chargeIds,
  })
  return { receipt, amountCents }
}

export async function deleteReceipt(receiptId: string): Promise<void> {
  // Allocations cascade; trigger refreshes charge paid amounts
  const { error } = await supabase.from('patient_payment_receipts').delete().eq('id', receiptId)
  if (error) throw error
}

export async function getPhysioBillingOverview(
  physiotherapistId: string
): Promise<PhysioBillingOverviewRow[]> {
  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, full_name')
    .eq('physiotherapist_id', physiotherapistId)
    .order('full_name')
  if (patientsError) throw patientsError
  if (!patients?.length) return []

  const patientIds = patients.map((p) => p.id)

  const [{ data: agreements, error: agrError }, { data: charges, error: chError }] = await Promise.all([
    supabase
      .from('patient_billing_agreements')
      .select('*')
      .eq('physiotherapist_id', physiotherapistId)
      .eq('is_active', true)
      .in('patient_id', patientIds),
    supabase
      .from('patient_billing_charges')
      .select('patient_id, amount_cents, amount_paid_cents, status')
      .eq('physiotherapist_id', physiotherapistId)
      .in('patient_id', patientIds),
  ])
  if (agrError) throw agrError
  if (chError) throw chError

  const agreementByPatient = new Map(
    (agreements ?? []).map((a) => [a.patient_id as string, a as BillingAgreement])
  )

  const stats = new Map<string, { expected: number; paid: number; open: number }>()
  for (const c of charges ?? []) {
    if (c.status === 'waived') continue
    const cur = stats.get(c.patient_id) ?? { expected: 0, paid: 0, open: 0 }
    cur.expected += c.amount_cents
    cur.paid += c.amount_paid_cents
    if (c.status === 'open' || c.status === 'partial') cur.open += 1
    stats.set(c.patient_id, cur)
  }

  return patients.map((p) => {
    const agreement = agreementByPatient.get(p.id) ?? null
    const s = stats.get(p.id) ?? { expected: 0, paid: 0, open: 0 }
    return {
      patientId: p.id,
      patientName: p.full_name,
      agreement,
      expectedCents: s.expected,
      paidCents: s.paid,
      balanceCents: s.expected - s.paid,
      openChargesCount: s.open,
      currency: agreement?.currency ?? 'BRL',
    }
  })
}

export function openChargesForWeek(charges: BillingCharge[], weekOf: string): BillingCharge[] {
  const start = weekStartOf(weekOf)
  const end = weekEndOf(weekOf)
  return charges.filter((c) => {
    if (!(c.status === 'open' || c.status === 'partial')) return false
    const day = c.due_date ?? c.period_start
    if (!day) return false
    return day >= start && day <= end
  })
}

export function weekBalanceCents(charges: BillingCharge[], weekOf: string): number {
  return openChargesForWeek(charges, weekOf).reduce((sum, c) => sum + chargeRemainingCents(c), 0)
}

export interface BillingWeekGroup {
  weekOf: string
  charges: BillingCharge[]
  dueCents: number
}

export function groupOpenChargesByWeek(charges: BillingCharge[]): BillingWeekGroup[] {
  const groups = new Map<string, BillingCharge[]>()
  for (const charge of charges) {
    if (!(charge.status === 'open' || charge.status === 'partial')) continue
    const weekOf = weekStartOf(charge.due_date ?? charge.period_start ?? charge.created_at)
    const list = groups.get(weekOf) ?? []
    list.push(charge)
    groups.set(weekOf, list)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekOf, items]) => ({
      weekOf,
      charges: [...items].sort((a, b) =>
        (a.due_date ?? a.created_at).localeCompare(b.due_date ?? b.created_at)
      ),
      dueCents: items.reduce((sum, charge) => sum + chargeRemainingCents(charge), 0),
    }))
}
