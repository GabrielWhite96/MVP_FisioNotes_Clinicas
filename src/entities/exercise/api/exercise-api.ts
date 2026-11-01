import { supabase } from '@/shared/api/supabase'

export type ExerciseDifficultyRating = 'easy' | 'moderate' | 'hard'

export interface ExerciseLibraryItem {
  id: string
  created_by: string | null
  title: string
  description: string | null
  instructions: string | null
  video_url: string | null
  difficulty: string | null
  tags: string[]
  category: string | null
  level: string | null
  duration_seconds: number | null
  contraindications: string | null
  clinical_notes: string | null
  storage_path: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function getExerciseLibrary(activeOnly = true): Promise<ExerciseLibraryItem[]> {
  let query = supabase.from('exercise_library').select('*').order('title')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ExerciseLibraryItem[]
}

export async function getPatientExercises(patientId: string) {
  const { data, error } = await supabase
    .from('patient_exercises')
    .select(`
      *,
      exercise:exercise_library(*),
      completions:exercise_completions(*)
    `)
    .eq('patient_id', patientId)
    .eq('active', true)
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return data
}

export async function assignExercise(input: {
  patientId: string
  physiotherapistId: string
  exerciseId: string
  sets?: number
  reps?: number
  frequency?: string
  notes?: string
}) {
  const { data, error } = await supabase
    .from('patient_exercises')
    .insert({
      patient_id: input.patientId,
      physiotherapist_id: input.physiotherapistId,
      exercise_id: input.exerciseId,
      sets: input.sets ?? 3,
      reps: input.reps ?? 10,
      frequency: input.frequency ?? 'daily',
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.rpc('log_audit_event', {
    p_action: 'EXERCISE_ASSIGNED',
    p_entity_type: 'patient_exercises',
    p_entity_id: data.id,
  })

  return data
}

export async function completeExercise(
  patientExerciseId: string,
  notes?: string,
  difficultyRating?: ExerciseDifficultyRating
) {
  const { data, error } = await supabase
    .from('exercise_completions')
    .insert({
      patient_exercise_id: patientExerciseId,
      notes: notes ?? null,
      difficulty_rating: difficultyRating ?? null,
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error

  await supabase.rpc('log_audit_event', {
    p_action: 'EXERCISE_COMPLETED',
    p_entity_type: 'exercise_completions',
    p_entity_id: data.id,
  })

  return data
}

export interface CreateExerciseInput {
  title: string
  description?: string
  instructions?: string
  createdBy: string
  category?: string
  level?: string
  durationSeconds?: number
  contraindications?: string
  clinicalNotes?: string
  videoUrl?: string
  tags?: string[]
  difficulty?: string
}

export async function createExercise(input: CreateExerciseInput): Promise<ExerciseLibraryItem> {
  const { data, error } = await supabase
    .from('exercise_library')
    .insert({
      title: input.title,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      created_by: input.createdBy,
      category: input.category ?? null,
      level: input.level ?? 'beginner',
      duration_seconds: input.durationSeconds ?? null,
      contraindications: input.contraindications ?? null,
      clinical_notes: input.clinicalNotes ?? null,
      video_url: input.videoUrl ?? null,
      tags: input.tags ?? [],
      difficulty: input.difficulty ?? null,
      is_active: true,
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  return data as ExerciseLibraryItem
}

export async function updateExercise(
  id: string,
  updates: Partial<{
    title: string
    description: string | null
    instructions: string | null
    category: string | null
    level: string | null
    duration_seconds: number | null
    contraindications: string | null
    clinical_notes: string | null
    video_url: string | null
    storage_path: string | null
    tags: string[]
    difficulty: string | null
    is_active: boolean
  }>
): Promise<ExerciseLibraryItem> {
  const { data, error } = await supabase
    .from('exercise_library')
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ExerciseLibraryItem
}

export async function uploadExerciseVideo(exerciseId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'mp4'
  const path = `${exerciseId}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('exercise-videos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  const { data: publicUrl } = supabase.storage.from('exercise-videos').getPublicUrl(path)
  await updateExercise(exerciseId, {
    storage_path: path,
    video_url: publicUrl.publicUrl,
  })
  return publicUrl.publicUrl
}

export function calculateExerciseProgress(
  exercises: Array<{ completions?: Array<{ id: string }> }>
): number {
  if (exercises.length === 0) return 0
  const withCompletions = exercises.filter((e) => (e.completions?.length ?? 0) > 0).length
  return Math.round((withCompletions / exercises.length) * 100)
}
