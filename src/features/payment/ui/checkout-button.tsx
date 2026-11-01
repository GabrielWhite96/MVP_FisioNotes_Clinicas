import { useMutation } from '@tanstack/react-query'
import { CreditCard } from 'lucide-react'
import { createCheckoutSession } from '@/entities/payment/api/payment-api'
import { Button } from '@/shared/ui/button'
import { pt } from '@/shared/config/i18n/pt'

interface CheckoutButtonProps {
  amountCents: number
  appointmentId?: string
  treatmentPlanId?: string
  label?: string
}

export function CheckoutButton({
  amountCents,
  appointmentId,
  treatmentPlanId,
  label,
}: CheckoutButtonProps) {
  const mutation = useMutation({
    mutationFn: () =>
      createCheckoutSession({
        amountCents,
        appointmentId,
        treatmentPlanId,
        successUrl: `${window.location.origin}${window.location.pathname}?paid=1`,
        cancelUrl: `${window.location.origin}${window.location.pathname}?paid=0`,
      }),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
  })

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || amountCents <= 0}
      >
        <CreditCard className="h-4 w-4" />
        {mutation.isPending ? pt.payment.processing : (label ?? pt.payment.pay)}
      </Button>
      {mutation.error && (
        <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}
    </div>
  )
}
