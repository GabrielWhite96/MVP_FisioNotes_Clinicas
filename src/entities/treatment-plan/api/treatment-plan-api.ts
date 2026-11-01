import { supabase } from '@/shared/api/supabase'

export type TreatmentPlanStatus = 'active' | 'completed' | 'paused' | 'discharged'
export type GoalMetricType = 'distance' | 'reps' | 'pain_scale' | 'custom'

export interface TreatmentPlan {
  id: string
  patient_id: string
  physiotherapist_id: string
  condition: string | null
  primary_goal: string
  duration_weeks: number
  frequency: string
  status: TreatmentPlanStatus
  started_at: string
  created_at: string
  updated_at: string
}

export interface TreatmentGoal {
  id: string
  treatment_plan_id: string
  title: string
  metric_type: GoalMetricType
  target_value: number | null
  current_value: number | null
  unit: string | null
  created_at: string
  updated_at: string
}

export interface CreateTreatmentPlanInput {
  patientId: string
  physiotherapistId: string
  primaryGoal: string
  condition?: string
  durationWeeks?: number
  frequency?: string
}

export interface UpdateTreatmentPlanInput {
  condition?: string | null
  primary_goal?: string
  duration_weeks?: number
  frequency?: string
  status?: TreatmentPlanStatus
}

export interface CreateTreatmentGoalInput {
  treatmentPlanId: string
  title: string
  metricType?: GoalMetricType
  targetValue?: number
  unit?: string
}

export async function getTreatmentPlans(patientId: string): Promise<TreatmentPlan[]> {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('patient_id', patientId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TreatmentPlan[]
}

export async function getActiveTreatmentPlan(patientId: string): Promise<TreatmentPlan | null> {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as TreatmentPlan | null) ?? null
}

export async function createTreatmentPlan(input: CreateTreatmentPlanInput): Promise<TreatmentPlan> {
  const { data, error } = await supabase
    .from('treatment_plans')
    .insert({
      patient_id: input.patientId,
      physiotherapist_id: input.physiotherapistId,
      primary_goal: input.primaryGoal,
      condition: input.condition ?? null,
      duration_weeks: input.durationWeeks ?? 8,
      frequency: input.frequency ?? '2 sessions/week',
      status: 'active',
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error

  await supabase
    .from('patients')
    .update({ clinical_status: 'in_treatment' })
    .eq('id', input.patientId)
    .neq('clinical_status', 'discharged')

  return data as TreatmentPlan
}

export async function updateTreatmentPlan(
  id: string,
  updates: UpdateTreatmentPlanInput
): Promise<TreatmentPlan> {
  const { data, error } = await supabase
    .from('treatment_plans')
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as TreatmentPlan
}

export async function getTreatmentGoals(planId: string): Promise<TreatmentGoal[]> {
  const { data, error } = await supabase
    .from('treatment_goals')
    .select('*')
    .eq('treatment_plan_id', planId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as TreatmentGoal[]
}

export async function createTreatmentGoal(input: CreateTreatmentGoalInput): Promise<TreatmentGoal> {
  const { data, error } = await supabase
    .from('treatment_goals')
    .insert({
      treatment_plan_id: input.treatmentPlanId,
      title: input.title,
      metric_type: input.metricType ?? 'custom',
      target_value: input.targetValue ?? null,
      current_value: 0,
      unit: input.unit ?? null,
    } as Record<string, unknown>)
    .select()
    .single()
  if (error) throw error
  return data as TreatmentGoal
}

export async function updateGoalProgress(goalId: string, currentValue: number): Promise<TreatmentGoal> {
  const { data, error } = await supabase
    .from('treatment_goals')
    .update({ current_value: currentValue } as Record<string, unknown>)
    .eq('id', goalId)
    .select()
    .single()
  if (error) throw error
  return data as TreatmentGoal
}

export async function dischargeTreatmentPlan(id: string): Promise<TreatmentPlan> {
  const plan = await updateTreatmentPlan(id, { status: 'discharged' })
  await supabase
    .from('patients')
    .update({ clinical_status: 'discharged' })
    .eq('id', plan.patient_id)
  return plan
}
