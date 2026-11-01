import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { subscribeSchema, type SubscribeFormData } from '../model/schemas'
import { startPublicSaasCheckout } from '@/entities/physiotherapist/api/saas-checkout-api'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { SAAS_PLAN } from '@/shared/config/saas-plan'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

export function SubscribeForm() {
  const [params] = useSearchParams()
  const checkoutState = params.get('checkout')
  const { register, handleSubmit, formState: { errors } } = useForm<SubscribeFormData>({
    resolver: zodResolver(subscribeSchema),
  })

  const mutation = useMutation({
    mutationFn: (data: SubscribeFormData) => startPublicSaasCheckout(data),
  })

  return (
    <div className="w-full">
      <h2 className="font-display text-3xl font-semibold tracking-tight">{pt.auth.subscribeTitle}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{pt.auth.subscribeDescription}</p>

      {checkoutState === 'success' ? (
        <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {pt.auth.subscribeSuccess}
        </p>
      ) : null}
      {checkoutState === 'cancel' ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {pt.auth.subscribeCancel}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="mt-8 flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">{pt.auth.fullName}</Label>
          <Input id="fullName" autoComplete="name" {...register('fullName')} />
          {errors.fullName ? <p className="text-sm text-[var(--color-destructive)]">{errors.fullName.message}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{pt.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            {...register('email')}
          />
          {errors.email ? <p className="text-sm text-[var(--color-destructive)]">{errors.email.message}</p> : null}
        </div>
        {mutation.error ? (
          <p className="text-sm text-[var(--color-destructive)]">{(mutation.error as Error).message}</p>
        ) : null}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? pt.common.loading : pt.auth.subscribeCta}
        </Button>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {SAAS_PLAN.amountLabel}/{SAAS_PLAN.interval}. {pt.auth.subscribeNote}
        </p>
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {pt.auth.hasAccount}{' '}
          <Link
            to={ROUTES.login}
            className="font-bold text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {pt.auth.login}
          </Link>
        </span>
      </form>
    </div>
  )
}
