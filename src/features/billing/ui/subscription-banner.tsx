import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { startSaasCheckout } from '@/entities/physiotherapist/api/saas-checkout-api'
import { getPhysiotherapistByProfileId } from '@/entities/physiotherapist/api/physiotherapist-api'
import { canManagePractice } from '@/entities/physiotherapist/model/subscription-access'
import { queryKeys } from '@/shared/api/query-keys'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'

export function SubscriptionBanner() {
  const { profile, user } = useAuth()
  const physioQuery = useQuery({
    queryKey: queryKeys.physiotherapist(user?.id ?? ''),
    queryFn: () => getPhysiotherapistByProfileId(user!.id),
    enabled: profile?.role === 'physiotherapist' && !!user?.id,
  })

  const checkout = useMutation({
    mutationFn: startSaasCheckout,
  })

  if (profile?.role !== 'physiotherapist' || !physioQuery.data) return null
  if (canManagePractice(physioQuery.data)) return null

  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p>{pt.saas.locked}</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={ROUTES.physio.subscription}>{pt.saas.status}</Link>
        </Button>
        <Button size="sm" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
          {checkout.isPending ? pt.common.loading : pt.saas.subscribe}
        </Button>
      </div>
      {checkout.error && <p className="w-full text-red-700">{(checkout.error as Error).message}</p>}
    </div>
  )
}
