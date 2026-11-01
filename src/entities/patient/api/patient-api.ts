import { supabase } from '@/shared/api/supabase'
import { assertPracticeWritable } from '@/entities/physiotherapist/model/subscription-access'
import type { Patient, PatientAccountStatus, PatientClinicalStatus } from '@/shared/types/database'

export type PhysioPatient = Patient & {
  profiles: { id: string; full_name: string; phone: string | null; avatar_url: string | null } | null
  therapists: { id: string; full_name: string }[]
}

export async function getPatientByProfileId(profileId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data
}

export async function getPatientById(patientId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single()
  if (error) throw error
  return data
}

export async function getPatientWithProfile(patientId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*, profiles(*)')
    .eq('id', patientId)
    .single()
  if (error) throw error
  return data as typeof data & {
    profiles: {
      id: string
      full_name: string
      phone: string | null
    } | null
  }
}

export async function getPhysioOwnedPatients(physiotherapistId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      profiles(id, full_name, phone, avatar_url),
      appointments (
        status,
        clinic_physiotherapists ( id, full_name )
      )
    `)
    .eq('physiotherapist_id', physiotherapistId)
    .order('full_name', { ascending: true })
  if (error) throw error

  return (data ?? []).map((row) => {
    const appointments = Array.isArray(row.appointments) ? row.appointments : []
    const therapists = new Map<string, { id: string; full_name: string }>()
    for (const appointment of appointments) {
      if (appointment.status === 'cancelled') continue
      const staff = appointment.clinic_physiotherapists as { id: string; full_name: string } | { id: string; full_name: string }[] | null | undefined
      const member = Array.isArray(staff) ? staff[0] ?? null : staff ?? null
      if (member?.id) therapists.set(member.id, member)
    }
    const { appointments: _appointments, ...patient } = row
    return {
      ...patient,
      therapists: [...therapists.values()],
    }
  }) as PhysioPatient[]
}

export type CreatePatientInput = {
  physiotherapistId: string
  fullName: string
  email?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
}

export async function createPatientForPhysio(input: CreatePatientInput) {
  await assertPracticeWritable(input.physiotherapistId)
  const { data, error } = await supabase
    .from('patients')
    .insert({
      physiotherapist_id: input.physiotherapistId,
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      date_of_birth: input.dateOfBirth || null,
      address_line1: input.addressLine1 || null,
      address_line2: input.addressLine2 || null,
      city: input.city || null,
      province: input.province || null,
      postal_code: input.postalCode || null,
      clinical_status: 'awaiting_assessment',
      account_status: 'no_account',
      profile_id: null,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.rpc('log_audit_event', {
    p_action: 'PATIENT_CREATED',
    p_entity_type: 'patients',
    p_entity_id: data.id,
  })

  return data
}

export async function updatePatient(id: string, updates: {
  full_name?: string
  email?: string | null
  phone?: string | null
  date_of_birth?: string | null
  identity_document?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  clinical_status?: PatientClinicalStatus
  account_status?: PatientAccountStatus
}) {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updatePatientClinicalStatus(id: string, clinicalStatus: PatientClinicalStatus) {
  return updatePatient(id, { clinical_status: clinicalStatus })
}

export async function updateProfile(id: string, updates: {
  full_name?: string
  phone?: string | null
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPatientResponsiblePhysio(patientId: string) {
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('physiotherapist_id')
    .eq('id', patientId)
    .single()
  if (patientError) throw patientError

  const { data, error } = await supabase
    .from('physiotherapists')
    .select('*, profiles(full_name, phone, avatar_url)')
    .eq('id', patient.physiotherapist_id)
    .single()
  if (error) throw error
  return data
}
