import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { startSaasCheckout } from '@/entities/physiotherapist/api/saas-checkout-api'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHeader } from '@/shared/ui/page-header'

export function InactivePracticeHub() {
  const checkout = useMutation({
    mutationFn: startSaasCheckout,
  })

  return (
    <div className="space-y-6">
      <PageHeader.Root>
        <PageHeader.Copy>
          <PageHeader.Title>{pt.physio.dashboard}</PageHeader.Title>
          <PageHeader.Description>{pt.physio.saasTagline}</PageHeader.Description>
        </PageHeader.Copy>
      </PageHeader.Root>

      <Card className="border-amber-300 bg-amber-50">
        <CardHeader>
          <CardTitle>{pt.saas.hubTitle}</CardTitle>
          <CardDescription className="text-amber-950/80">{pt.saas.hubBody}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => checkout.mutate()} disabled={checkout.isPending}>
            {checkout.isPending ? pt.common.loading : pt.saas.hubCta}
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.physio.subscription}>{pt.saas.status}</Link>
          </Button>
          {checkout.error ? (
            <p className="w-full text-sm text-red-700">{(checkout.error as Error).message}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
