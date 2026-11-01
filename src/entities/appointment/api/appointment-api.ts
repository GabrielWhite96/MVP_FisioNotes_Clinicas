import { supabase } from '@/shared/api/supabase'
import { assertPracticeWritable } from '@/entities/physiotherapist/model/subscription-access'
import type { AppointmentModality, AppointmentStatus } from '@/shared/types/database'
import { syncAppointmentToGoogleCalendar } from '@/entities/google-calendar/api/google-calendar-api'

export interface CreateAppointmentInput {
  patientId: string
  physiotherapistId: string
  modality: AppointmentModality
  scheduledAt: string
  homeAddress?: string
  notes?: string
  durationMinutes?: number
}

export async function getAppointments(filters?: {
  patientId?: string
  physiotherapistId?: string
  status?: AppointmentStatus[]
}) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(id, profile_id, full_name, city, province, profiles:profiles(full_name, phone)),
      physiotherapist:physiotherapists(id, profile_id, profiles:profiles(full_name, phone))
    `)
    .order('scheduled_at', { ascending: true })

  if (filters?.patientId) query = query.eq('patient_id', filters.patientId)
  if (filters?.physiotherapistId) query = query.eq('physiotherapist_id', filters.physiotherapistId)
  if (filters?.status?.length) query = query.in('status', filters.status)

  const { data, error } = await query
  if (error) throw error
  return data as AppointmentWithRelations[]
}

export type AppointmentWithRelations = {
  id: string
  patient_id: string
  physiotherapist_id: string
  modality: AppointmentModality
  status: AppointmentStatus
  scheduled_at: string
  duration_minutes: number
  home_address: string | null
  notes: string | null
  cancellation_reason: string | null
  price_cents: number | null
  patient?: {
    id: string
    profile_id: string | null
    full_name?: string
    city: string | null
    province: string | null
    profiles?: { full_name: string; phone: string | null } | null
  } | null
  physiotherapist?: {
    id: string
    profile_id: string
    profiles?: { full_name: string; phone: string | null } | null
  } | null
}

export async function getAppointmentById(id: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(*, profiles:profiles(full_name, phone)),
      physiotherapist:physiotherapists(*, profiles:profiles(full_name, phone))
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as AppointmentWithRelations & {
    patient?: {
      address_line1?: string | null
      city?: string | null
      province?: string | null
      profiles?: { full_name: string; phone: string | null } | null
    } | null
  }
}

export async function createAppointment(input: CreateAppointmentInput) {
  await assertPracticeWritable(input.physiotherapistId)
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: input.patientId,
      physiotherapist_id: input.physiotherapistId,
      modality: input.modality,
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes ?? 60,
      home_address: input.homeAddress ?? null,
      notes: input.notes ?? null,
      status: 'scheduled',
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  void syncAppointmentToGoogleCalendar(data.id)
  return data
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status } as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  const action = status === 'cancelled' ? 'APPOINTMENT_CANCELLED' : status === 'completed' ? 'APPOINTMENT_COMPLETED' : null
  if (action) {
    await supabase.rpc('log_audit_event', {
      p_action: action,
      p_entity_type: 'appointments',
      p_entity_id: id,
    } as Record<string, unknown>)
  }

  if (status === 'cancelled' || status === 'no_show') {
    void syncAppointmentToGoogleCalendar(id, { delete: true })
  } else {
    void syncAppointmentToGoogleCalendar(id)
  }

  return data
}

export async function rescheduleAppointment(id: string, scheduledAt: string) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ scheduled_at: scheduledAt } as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  void syncAppointmentToGoogleCalendar(id)
  return data
}

export async function cancelAppointmentWithReason(id: string, reason: string) {
  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancellation_reason: reason,
    } as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await supabase.rpc('log_audit_event', {
    p_action: 'APPOINTMENT_CANCELLED',
    p_entity_type: 'appointments',
    p_entity_id: id,
    p_metadata: { reason },
  } as Record<string, unknown>)

  void syncAppointmentToGoogleCalendar(id, { delete: true })

  return data
}

export async function getBookedSlots(physiotherapistId: string, date: string) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('appointments')
    .select('scheduled_at')
    .eq('physiotherapist_id', physiotherapistId)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .not('status', 'in', '("cancelled","no_show")')

  if (error) throw error
  return ((data ?? []) as Array<{ scheduled_at: string }>).map((a) => {
    const d = new Date(a.scheduled_at)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
}
