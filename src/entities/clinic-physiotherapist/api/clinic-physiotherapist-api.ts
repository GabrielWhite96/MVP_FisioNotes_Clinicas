import { supabase } from '@/shared/api/supabase'
import { assertPracticeWritable } from '@/entities/physiotherapist/model/subscription-access'
import type { ClinicPhysiotherapist } from '@/shared/types/database'

export type ClinicPhysiotherapistInput = {
  practiceId: string
  fullName: string
  email?: string | null
  phone?: string | null
  licenseNumber?: string | null
  specialties?: string[]
  isActive?: boolean
  notes?: string | null
}

export async function listClinicPhysiotherapists(practiceId: string, options?: { activeOnly?: boolean }) {
  let query = supabase
    .from('clinic_physiotherapists')
    .select('*')
    .eq('practice_id', practiceId)
    .order('full_name', { ascending: true })

  if (options?.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ClinicPhysiotherapist[]
}

export async function getClinicPhysiotherapistById(id: string) {
  const { data, error } = await supabase
    .from('clinic_physiotherapists')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as ClinicPhysiotherapist
}

export async function createClinicPhysiotherapist(input: ClinicPhysiotherapistInput) {
  await assertPracticeWritable(input.practiceId)
  const { data, error } = await supabase
    .from('clinic_physiotherapists')
    .insert({
      practice_id: input.practiceId,
      full_name: input.fullName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      license_number: input.licenseNumber?.trim() || null,
      specialties: input.specialties ?? [],
      is_active: input.isActive ?? true,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()
  if (error) throw error
  return data as ClinicPhysiotherapist
}

export async function updateClinicPhysiotherapist(
  id: string,
  practiceId: string,
  updates: {
    full_name?: string
    email?: string | null
    phone?: string | null
    license_number?: string | null
    specialties?: string[]
    is_active?: boolean
    notes?: string | null
  }
) {
  await assertPracticeWritable(practiceId)
  const { data, error } = await supabase
    .from('clinic_physiotherapists')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ClinicPhysiotherapist
}
