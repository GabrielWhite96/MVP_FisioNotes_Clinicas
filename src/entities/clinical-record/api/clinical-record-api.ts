import { supabase } from '@/shared/api/supabase'
import type { ClinicalRecordType } from '@/shared/types/database'
import type { AssessmentStructuredData } from '../model/assessment-schema'
import type { AnamneseStructuredData } from '../model/anamnese-schema'
import { summarizeAnamnese } from '../model/anamnese-schema'
import type { DischargeStructuredData } from '../model/discharge-schema'
import { summarizeDischarge } from '../model/discharge-schema'
import type { EvolutionStructuredData } from '../model/evolution-schema'
import {
  summarizeAssessment,
  summarizeEvolution,
  summarizeTreatmentPlan,
} from '../model/summaries'
import { getPatientWithProfile, updatePatient, updateProfile } from '@/entities/patient/api/patient-api'

export async function getClinicalRecords(patientId: string) {
  const { data, error } = await supabase
    .from('clinical_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function hasInitialAssessment(patientId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('clinical_records')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId)
    .eq('record_type', 'initial_assessment')
  if (error) throw error
  return (count ?? 0) > 0
}

export async function getLatestInitialOrReassessment(patientId: string) {
  const { data, error } = await supabase
    .from('clinical_records')
    .select('*')
    .eq('patient_id', patientId)
    .in('record_type', ['initial_assessment', 'reassessment'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getLatestEvolution(patientId: string) {
  const { data, error } = await supabase
    .from('clinical_records')
    .select('*')
    .eq('patient_id', patientId)
    .eq('record_type', 'evolution')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getAssessmentsForComparison(patientId: string) {
  const { data, error } = await supabase
    .from('clinical_records')
    .select('*')
    .eq('patient_id', patientId)
    .in('record_type', ['initial_assessment', 'reassessment'])
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

async function syncPersonalDataFromAssessment(
  patientId: string,
  personal: AssessmentStructuredData['personalData']
) {
  const hasAnything =
    Boolean(personal.fullName?.trim()) ||
    Boolean(personal.phone?.trim()) ||
    Boolean(personal.identityDocument?.trim()) ||
    Boolean(personal.dateOfBirth) ||
    Boolean(personal.addressLine1?.trim()) ||
    Boolean(personal.addressLine2?.trim()) ||
    Boolean(personal.city?.trim()) ||
    Boolean(personal.province?.trim()) ||
    Boolean(personal.postalCode?.trim())

  if (!hasAnything) return

  try {
    const patient = await getPatientWithProfile(patientId)
    if (!patient) return

    // Physio often cannot UPDATE patient profile/patients (RLS). Never block clinical save.
    if (personal.fullName?.trim() || personal.phone !== undefined) {
      await updateProfile(patient.profile_id, {
        ...(personal.fullName?.trim() ? { full_name: personal.fullName.trim() } : {}),
        phone: personal.phone?.trim() ? personal.phone.trim() : null,
      }).catch(() => undefined)
    }

    await updatePatient(patientId, {
      date_of_birth: personal.dateOfBirth || null,
      identity_document: personal.identityDocument?.trim() || null,
      address_line1: personal.addressLine1?.trim() || null,
      address_line2: personal.addressLine2?.trim() || null,
      city: personal.city?.trim() || null,
      province: personal.province?.trim() || null,
      postal_code: personal.postalCode?.trim() || null,
    }).catch(() => undefined)
  } catch {
    // Ignore sync failures — clinical record insert must still proceed.
  }
}

export async function createClinicalRecord(input: {
  appointmentId?: string
  physiotherapistId: string
  patientId: string
  recordType?: ClinicalRecordType
  structuredData?: AssessmentStructuredData | EvolutionStructuredData | AnamneseStructuredData | DischargeStructuredData | Record<string, unknown>
  assessment?: string
  observations?: string
  evolution?: string
  treatmentPlan?: string
  recommendations?: string
  nextEvaluationAt?: string | null
  performedById?: string | null
}) {
  const recordType = input.recordType ?? 'evolution'
  let assessment = input.assessment ?? null
  let evolution = input.evolution ?? null
  let treatmentPlan = input.treatmentPlan ?? null
  let observations = input.observations ?? null
  const structuredData = input.structuredData ?? {}

  if (
    (recordType === 'initial_assessment' || recordType === 'reassessment') &&
    input.structuredData &&
    'physicalExam' in input.structuredData
  ) {
    const data = input.structuredData as AssessmentStructuredData
    assessment = summarizeAssessment(data)
    treatmentPlan = summarizeTreatmentPlan(data)
    await syncPersonalDataFromAssessment(input.patientId, data.personalData)
  }

  if (
    recordType === 'anamnese' &&
    input.structuredData &&
    'anamnese' in input.structuredData &&
    !('physicalExam' in input.structuredData)
  ) {
    assessment = summarizeAnamnese(input.structuredData as AnamneseStructuredData)
  }

  if (
    recordType === 'evolution' &&
    input.structuredData &&
    ('sessionConducts' in input.structuredData || 'performed' in input.structuredData)
  ) {
    evolution = summarizeEvolution(input.structuredData as EvolutionStructuredData)
  }

  if (recordType === 'discharge' && input.structuredData && 'treatmentSummary' in input.structuredData) {
    observations = summarizeDischarge(input.structuredData as DischargeStructuredData)
  }

  const { data, error } = await supabase
    .from('clinical_records')
    .insert({
      appointment_id: input.appointmentId ?? null,
      physiotherapist_id: input.physiotherapistId,
      patient_id: input.patientId,
      record_type: recordType,
      structured_data: structuredData as Record<string, unknown>,
      assessment,
      observations,
      evolution,
      treatment_plan: treatmentPlan,
      recommendations: input.recommendations ?? null,
      next_evaluation_at: input.nextEvaluationAt ?? null,
      performed_by_id: input.performedById ?? null,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.rpc('log_audit_event', {
    p_action: 'CLINICAL_RECORD_CREATED',
    p_entity_type: 'clinical_records',
    p_entity_id: data.id,
  })

  if (recordType === 'reassessment') {
    await supabase
      .from('patients')
      .update({ clinical_status: 'reassessment' })
      .eq('id', input.patientId)
      .neq('clinical_status', 'discharged')
  }

  if (recordType === 'discharge') {
    await supabase
      .from('patients')
      .update({ clinical_status: 'discharged' })
      .eq('id', input.patientId)
  }

  return data
}

export async function updateClinicalRecord(id: string, updates: {
  assessment?: string
  observations?: string
  evolution?: string
  treatment_plan?: string
  recommendations?: string
  next_evaluation_at?: string | null
  record_type?: ClinicalRecordType
  structured_data?: Record<string, unknown>
}) {
  const { data, error } = await supabase
    .from('clinical_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await supabase.rpc('log_audit_event', {
    p_action: 'CLINICAL_RECORD_UPDATED',
    p_entity_type: 'clinical_records',
    p_entity_id: id,
  })

  return data
}
