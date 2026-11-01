import { supabase } from '@/shared/api/supabase'
import { ROUTES } from '@/shared/config/routes'
import type { SaasSubscriptionStatus } from '@/shared/types/database'

const PHYSIO_HUB_PATHS = [
  ROUTES.physio.dashboard,
  ROUTES.physio.profile,
  ROUTES.physio.notifications,
  ROUTES.physio.subscription,
] as const

export function isPhysioHubPath(pathname: string) {
  return PHYSIO_HUB_PATHS.some((path) => pathname === path)
}

export function canManagePractice(physio: {
  subscription_status: SaasSubscriptionStatus
  trial_ends_at?: string | null
}) {
  return physio.subscription_status === 'active'
}

export function trialDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export async function assertPracticeWritable(physiotherapistId: string) {
  const { data, error } = await supabase
    .from('physiotherapists')
    .select('subscription_status, trial_ends_at')
    .eq('id', physiotherapistId)
    .single()
  if (error) throw error
  if (!canManagePractice(data)) {
    throw new Error('Assinatura inativa. Assine para cadastrar pacientes e consultas.')
  }
}
