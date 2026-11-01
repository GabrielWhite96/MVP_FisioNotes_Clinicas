import { supabase } from '@/shared/api/supabase'

export interface CaregiverPermissions {
  view_progress: boolean
  view_appointments: boolean
  view_exercises: boolean
  view_clinical_records: boolean
}

export const DEFAULT_CAREGIVER_PERMISSIONS: CaregiverPermissions = {
  view_progress: true,
  view_appointments: true,
  view_exercises: true,
  view_clinical_records: false,
}

export interface CaregiverLink {
  id: string
  patient_id: string
  caregiver_profile_id: string
  permissions: CaregiverPermissions
  authorized_at: string
  revoked_at: string | null
  created_at: string
}

export interface CaregiverLinkWithProfile extends CaregiverLink {
  caregiver?: {
    id: string
    full_name: string
    phone: string | null
    avatar_url: string | null
  } | null
}

export interface CaregiverPatient {
  id: string
  city: string | null
  province: string | null
  profiles?: {
    full_name: string
    phone: string | null
    avatar_url: string | null
  } | null
}

export interface AuthorizeCaregiverInput {
  patientId: string
  caregiverProfileId: string
  permissions?: Partial<CaregiverPermissions>
}

export async function getCaregiverLinks(patientId: string): Promise<CaregiverLinkWithProfile[]> {
  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .select(`
      *,
      caregiver:profiles(id, full_name, phone, avatar_url)
    `)
    .eq('patient_id', patientId)
    .is('revoked_at', null)
    .order('authorized_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CaregiverLinkWithProfile[]
}

export async function authorizeCaregiver(input: AuthorizeCaregiverInput): Promise<CaregiverLink> {
  const permissions: CaregiverPermissions = {
    ...DEFAULT_CAREGIVER_PERMISSIONS,
    ...input.permissions,
  }

  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .upsert(
      {
        patient_id: input.patientId,
        caregiver_profile_id: input.caregiverProfileId,
        permissions,
        authorized_at: new Date().toISOString(),
        revoked_at: null,
      } as Record<string, unknown>,
      { onConflict: 'patient_id,caregiver_profile_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data as CaregiverLink
}

export async function revokeCaregiver(linkId: string): Promise<CaregiverLink> {
  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .update({ revoked_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', linkId)
    .select()
    .single()
  if (error) throw error
  return data as CaregiverLink
}

export async function findCaregiverByEmail(email: string): Promise<{ id: string; full_name: string }> {
  const { data, error } = await supabase.rpc('lookup_profile_by_email', {
    p_email: email.trim().toLowerCase(),
  })
  if (error) throw error
  const row = (Array.isArray(data) ? data[0] : data) as { id?: string; full_name?: string } | null
  if (!row?.id) {
    throw new Error('Nenhum cuidador encontrado com este e-mail. Peça para a pessoa criar uma conta.')
  }
  return { id: row.id, full_name: row.full_name ?? email }
}

export interface CaregiverLinkWithPatient extends CaregiverLink {
  patient?: CaregiverPatient | null
}

export async function getCaregiverLinksForCaregiver(
  caregiverProfileId: string
): Promise<CaregiverLinkWithPatient[]> {
  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .select(`
      *,
      patient:patients(
        id, city, province,
        profiles:profiles(full_name, phone, avatar_url)
      )
    `)
    .eq('caregiver_profile_id', caregiverProfileId)
    .is('revoked_at', null)
    .order('authorized_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => {
    const nested = (row as unknown as { patient?: CaregiverPatient | CaregiverPatient[] | null }).patient
    const patient = Array.isArray(nested) ? nested[0] : nested
    return { ...(row as CaregiverLink), patient: patient ?? null }
  })
}

export async function getCaregiverPatients(
  caregiverProfileId: string
): Promise<CaregiverPatient[]> {
  const { data, error } = await supabase
    .from('patient_caregiver_links')
    .select(`
      patient:patients(
        id, city, province,
        profiles:profiles(full_name, phone, avatar_url)
      )
    `)
    .eq('caregiver_profile_id', caregiverProfileId)
    .is('revoked_at', null)

  if (error) throw error

  return (
    data
      ?.map((row) => {
        const nested = (row as unknown as { patient?: CaregiverPatient | CaregiverPatient[] | null })
          .patient
        return Array.isArray(nested) ? nested[0] : nested
      })
      .filter((p): p is CaregiverPatient => Boolean(p)) ?? []
  )
}
