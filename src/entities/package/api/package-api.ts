import { supabase } from '@/shared/api/supabase'

export interface RecoveryPackage {
  id: string
  code: string
  name: string
  description: string | null
  duration_weeks: number
  home_visits_included: number
  virtual_sessions_included: number
  exercise_monitoring: boolean
  price_cents: number
  currency: string
  is_active: boolean
}

export type PackagePurchaseStatus = 'pending' | 'active' | 'exhausted' | 'cancelled'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export interface PackagePurchase {
  id: string
  patient_id: string
  package_id: string
  payment_id: string | null
  status: PackagePurchaseStatus
  home_visits_used: number
  virtual_sessions_used: number
  started_at: string | null
  expires_at: string | null
  created_at: string
  package?: RecoveryPackage | null
}

export interface Invoice {
  id: string
  patient_id: string
  payment_id: string | null
  package_purchase_id: string | null
  appointment_id: string | null
  invoice_number: string
  amount_cents: number
  currency: string
  status: InvoiceStatus
  issued_at: string
  paid_at: string | null
  line_items: Array<{ label: string; amount_cents: number }>
}

export async function getRecoveryPackages(): Promise<RecoveryPackage[]> {
  const { data, error } = await supabase
    .from('recovery_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_cents')
  if (error) throw error
  return (data ?? []) as RecoveryPackage[]
}

export async function getPatientPackagePurchases(patientId: string): Promise<PackagePurchase[]> {
  const { data, error } = await supabase
    .from('package_purchases')
    .select('*, package:recovery_packages(*)')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const nested = (row as { package?: RecoveryPackage | RecoveryPackage[] | null }).package
    const pkg = Array.isArray(nested) ? nested[0] : nested
    return { ...(row as PackagePurchase), package: pkg ?? null }
  })
}

export async function getPatientInvoices(patientId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('patient_id', patientId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Invoice[]
}

export async function createPackageCheckout(input: {
  packageId: string
  amountCents: number
  successUrl?: string
  cancelUrl?: string
}) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      amountCents: input.amountCents,
      packageId: input.packageId,
      successUrl: input.successUrl ?? `${window.location.origin}/patient/billing?paid=1`,
      cancelUrl: input.cancelUrl ?? `${window.location.origin}/patient/billing?paid=0`,
    },
  })
  if (error) throw error
  return data as { url: string; paymentId: string; demo?: boolean }
}

export function packageUsageLabel(purchase: PackagePurchase): string {
  const pkg = purchase.package
  if (!pkg) return '—'
  return `${purchase.home_visits_used}/${pkg.home_visits_included} domiciliar · ${purchase.virtual_sessions_used}/${pkg.virtual_sessions_included} virtual`
}
