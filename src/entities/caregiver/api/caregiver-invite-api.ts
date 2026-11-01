import { supabase } from '@/shared/api/supabase'
import {
  authorizeCaregiver,
  DEFAULT_CAREGIVER_PERMISSIONS,
  type CaregiverPermissions,
} from '@/entities/caregiver/api/caregiver-api'

export type CaregiverInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface CaregiverInvite {
  id: string
  patient_id: string
  email: string
  invite_token: string
  permissions: CaregiverPermissions
  status: CaregiverInviteStatus
  invited_by: string | null
  accepted_profile_id: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export async function getCaregiverInvites(patientId: string): Promise<CaregiverInvite[]> {
  const { data, error } = await supabase
    .from('caregiver_invites')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CaregiverInvite[]
}

export async function createCaregiverInvite(input: {
  patientId: string
  email: string
  invitedBy: string
  permissions?: Partial<CaregiverPermissions>
}): Promise<CaregiverInvite> {
  const permissions = { ...DEFAULT_CAREGIVER_PERMISSIONS, ...input.permissions }
  const { data, error } = await supabase
    .from('caregiver_invites')
    .insert({
      patient_id: input.patientId,
      email: input.email.trim().toLowerCase(),
      permissions,
      invited_by: input.invitedBy,
      status: 'pending',
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  return data as CaregiverInvite
}

export async function revokeCaregiverInvite(inviteId: string): Promise<CaregiverInvite> {
  const { data, error } = await supabase
    .from('caregiver_invites')
    .update({ status: 'revoked' } as Record<string, unknown>)
    .eq('id', inviteId)
    .select()
    .single()
  if (error) throw error
  return data as CaregiverInvite
}

export async function getPendingInvitesForEmail(email: string): Promise<CaregiverInvite[]> {
  const { data, error } = await supabase
    .from('caregiver_invites')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CaregiverInvite[]
}

export async function acceptCaregiverInvite(inviteId: string, caregiverProfileId: string) {
  const { data: invite, error } = await supabase
    .from('caregiver_invites')
    .select('*')
    .eq('id', inviteId)
    .single()
  if (error) throw error

  const row = invite as CaregiverInvite
  if (row.status !== 'pending') throw new Error('Convite já utilizado ou revogado.')
  if (new Date(row.expires_at) < new Date()) throw new Error('Convite expirado.')

  await authorizeCaregiver({
    patientId: row.patient_id,
    caregiverProfileId,
    permissions: row.permissions,
  })

  const { data, error: updateError } = await supabase
    .from('caregiver_invites')
    .update({
      status: 'accepted',
      accepted_profile_id: caregiverProfileId,
      accepted_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', inviteId)
    .select()
    .single()
  if (updateError) throw updateError
  return data as CaregiverInvite
}
