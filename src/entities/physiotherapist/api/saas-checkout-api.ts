import { supabase } from '@/shared/api/supabase'
import type { SaasSubscriptionStatus } from '@/shared/types/database'

async function openSaasCheckout(body: {
  origin: string
  email?: string
  fullName?: string
}) {
  const { data, error } = await supabase.functions.invoke('create-saas-checkout', { body })
  if (error) {
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      const payload = await context.json().catch(() => null) as { error?: string } | null
      if (payload?.error) throw new Error(payload.error)
    }
    throw new Error('Não foi possível abrir o checkout.')
  }
  const payload = (data ?? {}) as { url?: string; error?: string }
  if (!payload.url) throw new Error(payload.error ?? 'Checkout indisponível')
  window.location.assign(payload.url)
}

export async function startSaasCheckout() {
  await openSaasCheckout({ origin: window.location.origin })
}

export async function startPublicSaasCheckout(input: { email: string; fullName: string }) {
  await openSaasCheckout({
    origin: window.location.origin,
    email: input.email,
    fullName: input.fullName,
  })
}

export async function getAdminPhysioSubscriptions() {
  const { data, error } = await supabase
    .from('physiotherapists')
    .select('id, subscription_status, trial_ends_at, profiles:profiles(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Array<{
    id: string
    subscription_status: SaasSubscriptionStatus
    trial_ends_at: string | null
    profiles: { full_name: string } | { full_name: string }[] | null
  }>
}

export async function setPhysioSubscriptionStatus(id: string, status: SaasSubscriptionStatus) {
  const { error } = await supabase
    .from('physiotherapists')
    .update({ subscription_status: status })
    .eq('id', id)
  if (error) throw error
}
