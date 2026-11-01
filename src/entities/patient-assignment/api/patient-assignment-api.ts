import { supabase } from '@/shared/api/supabase'
import type { ClinicPhysiotherapist, Patient, PatientTherapistAssignment } from '@/shared/types/database'

export type AssignmentWithStaff = PatientTherapistAssignment & {
  clinic_physiotherapists: Pick<ClinicPhysiotherapist, 'id' | 'full_name' | 'license_number' | 'is_active'> | null
}

export type AssignmentWithPatient = PatientTherapistAssignment & {
  patients: Pick<Patient, 'id' | 'full_name' | 'clinical_status'> | null
}

export async function listPatientAssignments(patientId: string) {
  const { data, error } = await supabase
    .from('patient_therapist_assignments')
    .select('*, clinic_physiotherapists(id, full_name, license_number, is_active)')
    .eq('patient_id', patientId)
    .order('started_on', { ascending: false })
  if (error) throw error
  return (data ?? []) as AssignmentWithStaff[]
}

export async function getCurrentPatientAssignment(patientId: string) {
  const { data, error } = await supabase
    .from('patient_therapist_assignments')
    .select('*, clinic_physiotherapists(id, full_name, license_number, is_active)')
    .eq('patient_id', patientId)
    .is('ended_on', null)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as AssignmentWithStaff | null
}

export async function listStaffAssignments(clinicPhysiotherapistId: string) {
  const { data, error } = await supabase
    .from('patient_therapist_assignments')
    .select('*, patients(id, full_name, clinical_status)')
    .eq('clinic_physiotherapist_id', clinicPhysiotherapistId)
    .order('started_on', { ascending: false })
  if (error) throw error
  return (data ?? []) as AssignmentWithPatient[]
}

export async function assignPatientTherapist(input: {
  patientId: string
  clinicPhysiotherapistId: string
  startedOn?: string
}) {
  const { data, error } = await supabase.rpc('assign_patient_therapist', {
    p_patient_id: input.patientId,
    p_clinic_physiotherapist_id: input.clinicPhysiotherapistId,
    ...(input.startedOn ? { p_started_on: input.startedOn } : {}),
  })
  if (error) throw error
  return data as PatientTherapistAssignment
}
