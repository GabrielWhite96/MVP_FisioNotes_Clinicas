import { supabase } from '@/shared/api/supabase'

export type ConsentType =
  | 'telehealth'
  | 'privacy'
  | 'caregiver_access'
  | 'data_processing'
  | 'terms'

export const REQUIRED_CONSENT_TYPES: ConsentType[] = [
  'telehealth',
  'privacy',
  'data_processing',
  'terms',
]

export interface Consent {
  id: string
  patient_id: string
  type: ConsentType
  version: string
  accepted_at: string
  revoked_at: string | null
  expires_at: string | null
  created_at: string
}

export const CURRENT_CONSENT_VERSION = '1.1'

export interface AcceptConsentInput {
  patientId: string
  type: ConsentType
  version?: string
}

export async function getConsents(patientId: string): Promise<Consent[]> {
  const { data, error } = await supabase
    .from('consents')
    .select('*')
    .eq('patient_id', patientId)
    .order('accepted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Consent[]
}

export async function acceptConsent(input: AcceptConsentInput): Promise<Consent> {
  const { data, error } = await supabase
    .from('consents')
    .insert({
      patient_id: input.patientId,
      type: input.type,
      version: input.version ?? CURRENT_CONSENT_VERSION,
      accepted_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  return data as Consent
}

export async function revokeConsent(consentId: string): Promise<Consent> {
  const { data, error } = await supabase
    .from('consents')
    .update({ revoked_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', consentId)
    .select()
    .single()
  if (error) throw error
  return data as Consent
}

function isConsentActive(c: Consent): boolean {
  if (c.revoked_at) return false
  if (c.expires_at && new Date(c.expires_at) < new Date()) return false
  return true
}

export async function hasRequiredConsents(patientId: string): Promise<boolean> {
  const consents = await getConsents(patientId)
  const activeByType = new Map<ConsentType, Consent>()
  for (const c of consents) {
    if (!isConsentActive(c)) continue
    if (!activeByType.has(c.type)) activeByType.set(c.type, c)
  }
  return REQUIRED_CONSENT_TYPES.every((type) => {
    const c = activeByType.get(type)
    return !!c && c.version === CURRENT_CONSENT_VERSION
  })
}
