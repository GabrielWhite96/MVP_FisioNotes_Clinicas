import { supabase } from '@/shared/api/supabase'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface Payment {
  id: string
  patient_id: string
  appointment_id: string | null
  treatment_plan_id: string | null
  amount_cents: number
  currency: string
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  status: PaymentStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePaymentRecordInput {
  patientId: string
  amountCents: number
  appointmentId?: string
  treatmentPlanId?: string
  currency?: string
  stripePaymentIntentId?: string
  stripeCheckoutSessionId?: string
  status?: PaymentStatus
  metadata?: Record<string, unknown>
}

export async function createCheckoutSession(input: {
  amountCents: number
  appointmentId?: string
  treatmentPlanId?: string
  successUrl?: string
  cancelUrl?: string
}): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: input,
  })
  if (error) throw error
  const payload = data as { url?: string } | null
  if (!payload?.url) throw new Error('Checkout indisponível no momento.')
  return { url: payload.url }
}

export async function getPayments(patientId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Payment[]
}

export async function createPaymentRecord(input: CreatePaymentRecordInput): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      patient_id: input.patientId,
      appointment_id: input.appointmentId ?? null,
      treatment_plan_id: input.treatmentPlanId ?? null,
      amount_cents: input.amountCents,
      currency: input.currency ?? 'CAD',
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      status: input.status ?? 'pending',
      metadata: input.metadata ?? {},
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  return data as Payment
}
