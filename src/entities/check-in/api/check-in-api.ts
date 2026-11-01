import { supabase } from '@/shared/api/supabase'

export interface CheckIn {
  id: string
  patient_id: string
  pain_level: number | null
  mobility_level: number | null
  confidence_level: number | null
  exercise_difficulty: number | null
  general_notes: string | null
  created_at: string
}

export interface CreateCheckInInput {
  patientId: string
  painLevel?: number
  mobilityLevel?: number
  confidenceLevel?: number
  exerciseDifficulty?: number
  generalNotes?: string
}

export async function getCheckIns(patientId: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CheckIn[]
}

export async function createCheckIn(input: CreateCheckInInput): Promise<CheckIn> {
  const { data, error } = await supabase
    .from('check_ins')
    .insert({
      patient_id: input.patientId,
      pain_level: input.painLevel ?? null,
      mobility_level: input.mobilityLevel ?? null,
      confidence_level: input.confidenceLevel ?? null,
      exercise_difficulty: input.exerciseDifficulty ?? null,
      general_notes: input.generalNotes ?? null,
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  return data as CheckIn
}

export async function getAdherenceScore(patientId: string, days = 7): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_adherence_score', {
    p_patient_id: patientId,
    p_days: days,
  })
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

export async function getLatestCheckIn(patientId: string): Promise<CheckIn | null> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as CheckIn | null) ?? null
}
