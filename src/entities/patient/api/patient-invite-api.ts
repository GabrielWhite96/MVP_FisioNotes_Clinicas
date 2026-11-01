import { supabase } from '@/shared/api/supabase'
import type { PatientInvite } from '@/shared/types/database'

export type PatientInviteLookup = {
  id: string
  patient_id: string
  email: string
  status: PatientInvite['status']
  expires_at: string
  patient_full_name: string
  physiotherapist_name: string
}

export async function getPatientInviteByToken(token: string) {
  const { data, error } = await supabase.rpc('get_patient_invite_by_token', {
    p_token: token,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return (row ?? null) as PatientInviteLookup | null
}

export async function getLatestPatientInvite(patientId: string) {
  const { data, error } = await supabase
    .from('patient_invites')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createPatientInvite(input: {
  patientId: string
  physiotherapistId: string
  email: string
  invitedBy: string
}) {
  await supabase
    .from('patient_invites')
    .update({ status: 'revoked' })
    .eq('patient_id', input.patientId)
    .eq('status', 'pending')

  const { data, error } = await supabase
    .from('patient_invites')
    .insert({
      patient_id: input.patientId,
      physiotherapist_id: input.physiotherapistId,
      email: input.email.trim().toLowerCase(),
      invited_by: input.invitedBy,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error

  await supabase
    .from('patients')
    .update({ account_status: 'invite_pending', email: input.email.trim().toLowerCase() })
    .eq('id', input.patientId)

  return data
}

export async function resendPatientInvite(input: {
  patientId: string
  physiotherapistId: string
  email: string
  invitedBy: string
}) {
  return createPatientInvite(input)
}

export function buildPatientInviteUrl(token: string) {
  return `${window.location.origin}/auth/invite/${token}`
}
