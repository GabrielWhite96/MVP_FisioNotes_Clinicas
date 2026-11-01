import { supabase } from '@/shared/api/supabase'

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface AtRiskPatient {
  patientId: string
  patientName: string
  reasons: Array<'high_pain' | 'low_adherence' | 'missing_check_in'>
  painLevel: number | null
  adherenceScore: number | null
}

const HIGH_PAIN_THRESHOLD = 7
const LOW_ADHERENCE_THRESHOLD = 50
const MISSING_CHECK_IN_DAYS = 7

export function appointmentIdFromNotification(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>).appointment_id
  return typeof value === 'string' && value.trim() ? value : null
}

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
  await Promise.all((data ?? []).map((n) => markNotificationRead(n.id)))
}

export async function getAuditLogs(filters?: {
  entityType?: string
  actorId?: string
  limit?: number
}): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100)

  if (filters?.entityType) query = query.eq('entity_type', filters.entityType)
  if (filters?.actorId) query = query.eq('actor_id', filters.actorId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AuditLog[]
}

type CareRelationshipRow = {
  patient_id: string
  patient:
    | {
        id: string
        full_name: string
        profiles: { full_name: string } | { full_name: string }[] | null
      }
    | Array<{
        id: string
        full_name: string
        profiles: { full_name: string } | { full_name: string }[] | null
      }>
    | null
}

export async function getAtRiskPatients(physiotherapistId?: string): Promise<AtRiskPatient[]> {
  let query = supabase
    .from('care_relationships')
    .select(`
      patient_id,
      patient:patients(
        id,
        full_name,
        profiles:profiles(full_name)
      )
    `)
    .is('ended_at', null)

  if (physiotherapistId) query = query.eq('physiotherapist_id', physiotherapistId)

  const { data, error } = await query
  if (error) throw error

  const relationships = (data ?? []) as unknown as CareRelationshipRow[]
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - MISSING_CHECK_IN_DAYS)

  const results = await Promise.all(
    relationships.map(async (rel) => {
      const patientId = rel.patient_id
      const patient = Array.isArray(rel.patient) ? rel.patient[0] : rel.patient
      const profile = Array.isArray(patient?.profiles)
        ? patient.profiles[0]
        : patient?.profiles
      const patientName = patient?.full_name ?? profile?.full_name ?? 'Paciente'

      const [checkInResult, adherenceResult, planResult] = await Promise.all([
        supabase
          .from('check_ins')
          .select('pain_level, created_at')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc('calculate_adherence_score', {
          p_patient_id: patientId,
          p_days: MISSING_CHECK_IN_DAYS,
        }),
        supabase
          .from('treatment_plans')
          .select('id')
          .eq('patient_id', patientId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle(),
      ])

      const painLevel = (checkInResult.data?.pain_level as number | null) ?? null
      const checkInAt = checkInResult.data?.created_at as string | undefined
      const adherenceScore =
        typeof adherenceResult.data === 'number' ? adherenceResult.data : null
      const hasActivePlan = Boolean(planResult.data)

      const reasons: AtRiskPatient['reasons'] = []
      if (painLevel !== null && painLevel >= HIGH_PAIN_THRESHOLD) reasons.push('high_pain')
      if (hasActivePlan && adherenceScore !== null && adherenceScore < LOW_ADHERENCE_THRESHOLD) {
        reasons.push('low_adherence')
      }
      if (hasActivePlan && (!checkInAt || new Date(checkInAt) < cutoff)) {
        reasons.push('missing_check_in')
      }

      if (reasons.length === 0) return null

      return { patientId, patientName, reasons, painLevel, adherenceScore }
    })
  )

  return results.filter((r): r is AtRiskPatient => r !== null)
}

export async function getAdminStats() {
  const [patients, physios, completed, upcoming, cancelled] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('physiotherapists').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString()),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ])

  return {
    patients: patients.count ?? 0,
    physiotherapists: physios.count ?? 0,
    completedAppointments: completed.count ?? 0,
    upcomingAppointments: upcoming.count ?? 0,
    cancelledAppointments: cancelled.count ?? 0,
  }
}

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function promoteUserRole(userId: string, role: 'admin' | 'patient' | 'physiotherapist' | 'caregiver') {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAdminAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(profiles:profiles(full_name)),
      physiotherapist:physiotherapists(profiles:profiles(full_name))
    `)
    .order('scheduled_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}
