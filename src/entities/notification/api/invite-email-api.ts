import { supabase } from '@/shared/api/supabase'

export async function sendInviteEmail(input: {
  inviteId: string
  kind: 'patient' | 'caregiver'
}): Promise<{ sent: boolean; reason?: string }> {
  const { data, error } = await supabase.functions.invoke('send-invite-email', {
    body: input,
  })
  if (error) return { sent: false, reason: error.message }
  const payload = (data ?? {}) as { sent?: boolean; reason?: string }
  return { sent: Boolean(payload.sent), reason: payload.reason }
}
