import { supabase } from '@/shared/api/supabase'

export type TimelineEventType =
  | 'clinical_record'
  | 'appointment'
  | 'exercise_completion'
  | 'check_in'

export interface TimelineEvent {
  patient_id: string
  event_at: string
  event_type: TimelineEventType
  title: string
  entity_id: string
}

export async function getPatientTimeline(patientId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('patient_timeline')
    .select('*')
    .eq('patient_id', patientId)
    .order('event_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as TimelineEvent[]
}
