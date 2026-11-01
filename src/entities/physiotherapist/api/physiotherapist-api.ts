import { supabase } from '@/shared/api/supabase'
import type { AppointmentModality } from '@/shared/types/database'
import { getPhysioOwnedPatients } from '@/entities/patient/api/patient-api'

export async function getPhysiotherapistByProfileId(profileId: string) {
  const { data, error } = await supabase
    .from('physiotherapists')
    .select('*')
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data
}

export async function getPhysiotherapistById(id: string) {
  const { data, error } = await supabase
    .from('physiotherapists')
    .select('*, profiles:profiles(full_name, avatar_url, phone)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function updatePhysiotherapist(id: string, updates: {
  license_number?: string | null
  province?: string | null
  specialties?: string[]
  experience_years?: number | null
  modalities?: AppointmentModality[]
  service_cities?: string[]
  bio?: string | null
}) {
  const { data, error } = await supabase
    .from('physiotherapists')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** @deprecated Use getPhysioOwnedPatients from patient-api */
export async function getPhysioPatients(physiotherapistId: string) {
  return getPhysioOwnedPatients(physiotherapistId)
}

export async function getAvailability(physiotherapistId: string) {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('physiotherapist_id', physiotherapistId)
    .eq('is_active', true)
  if (error) throw error
  return data
}

export async function setAvailability(
  physiotherapistId: string,
  slots: Array<{
    day_of_week: number
    start_time: string
    end_time: string
    modality: AppointmentModality
  }>
) {
  await supabase.from('availability').delete().eq('physiotherapist_id', physiotherapistId)
  if (slots.length === 0) return []
  const { data, error } = await supabase
    .from('availability')
    .insert(slots.map((s) => ({ ...s, physiotherapist_id: physiotherapistId })))
    .select()
  if (error) throw error
  return data
}
