import { supabase } from '@/shared/api/supabase'

export type TelehealthSessionStatus =
  | 'created'
  | 'joined'
  | 'in_progress'
  | 'ended'
  | 'failed'

export interface TelehealthSession {
  id: string
  appointment_id: string
  provider: string
  room_name: string | null
  room_url: string | null
  status: TelehealthSessionStatus
  started_at: string | null
  ended_at: string | null
  created_by: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function getTelehealthSession(appointmentId: string): Promise<TelehealthSession | null> {
  const { data, error } = await supabase
    .from('telehealth_sessions')
    .select('*')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (error) throw error
  return (data as TelehealthSession | null) ?? null
}

export async function upsertTelehealthSession(input: {
  appointmentId: string
  provider: string
  roomName?: string | null
  roomUrl?: string | null
  status?: TelehealthSessionStatus
  createdBy?: string | null
  metadata?: Record<string, unknown>
}): Promise<TelehealthSession> {
  const existing = await getTelehealthSession(input.appointmentId)
  if (existing) {
    const { data, error } = await supabase
      .from('telehealth_sessions')
      .update({
        provider: input.provider,
        room_name: input.roomName ?? existing.room_name,
        room_url: input.roomUrl ?? existing.room_url,
        status: input.status ?? existing.status,
        started_at: existing.started_at ?? (input.status === 'joined' || input.status === 'in_progress'
          ? new Date().toISOString()
          : null),
        metadata: { ...existing.metadata, ...(input.metadata ?? {}) },
      } as Record<string, unknown>)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data as TelehealthSession
  }

  const { data, error } = await supabase
    .from('telehealth_sessions')
    .insert({
      appointment_id: input.appointmentId,
      provider: input.provider,
      room_name: input.roomName ?? null,
      room_url: input.roomUrl ?? null,
      status: input.status ?? 'created',
      started_at: input.status === 'joined' || input.status === 'in_progress'
        ? new Date().toISOString()
        : null,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  return data as TelehealthSession
}

export async function endTelehealthSession(appointmentId: string): Promise<TelehealthSession | null> {
  const existing = await getTelehealthSession(appointmentId)
  if (!existing) return null
  const { data, error } = await supabase
    .from('telehealth_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', existing.id)
    .select()
    .single()
  if (error) throw error
  return data as TelehealthSession
}
