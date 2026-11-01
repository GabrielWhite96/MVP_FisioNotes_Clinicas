import { supabase } from '@/shared/api/supabase'

export interface ClinicalProfile {
  id: string
  patient_id: string
  condition: string | null
  diagnosis: string | null
  medical_history: string | null
  medications: string | null
  allergies: string | null
  restrictions: string | null
  referring_physician: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface UpsertClinicalProfileInput {
  patientId: string
  condition?: string | null
  diagnosis?: string | null
  medicalHistory?: string | null
  medications?: string | null
  allergies?: string | null
  restrictions?: string | null
  referringPhysician?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
}

export async function getClinicalProfile(patientId: string): Promise<ClinicalProfile | null> {
  const { data, error } = await supabase
    .from('patient_clinical_profiles')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()
  if (error) throw error
  return (data as ClinicalProfile | null) ?? null
}

export async function upsertClinicalProfile(
  input: UpsertClinicalProfileInput
): Promise<ClinicalProfile> {
  const { data, error } = await supabase
    .from('patient_clinical_profiles')
    .upsert(
      {
        patient_id: input.patientId,
        condition: input.condition ?? null,
        diagnosis: input.diagnosis ?? null,
        medical_history: input.medicalHistory ?? null,
        medications: input.medications ?? null,
        allergies: input.allergies ?? null,
        restrictions: input.restrictions ?? null,
        referring_physician: input.referringPhysician ?? null,
        emergency_contact_name: input.emergencyContactName ?? null,
        emergency_contact_phone: input.emergencyContactPhone ?? null,
      } as Record<string, unknown>,
      { onConflict: 'patient_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as ClinicalProfile
}
