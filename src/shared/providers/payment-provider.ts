export interface PaymentIntent {
  amountCents: number
  currency: string
  metadata?: Record<string, unknown>
}

export interface PaymentProvider {
  createCheckout(input: {
    amountCents: number
    appointmentId?: string
    treatmentPlanId?: string
    successUrl?: string
    cancelUrl?: string
  }): Promise<{ url: string }>
  createPaymentIntent(intent: PaymentIntent): Promise<{ clientSecret: string }>
  confirmPayment(paymentId: string): Promise<{ status: string }>
}

export class MockPaymentProvider implements PaymentProvider {
  async createCheckout(input: { amountCents: number }): Promise<{ url: string }> {
    return { url: `http://localhost:5173?paid=demo&amount=${input.amountCents}` }
  }

  async createPaymentIntent(_intent: PaymentIntent): Promise<{ clientSecret: string }> {
    return { clientSecret: 'mock_secret' }
  }

  async confirmPayment(_paymentId: string): Promise<{ status: string }> {
    return { status: 'succeeded' }
  }
}

export class StripePaymentProvider implements PaymentProvider {
  async createCheckout(input: {
    amountCents: number
    appointmentId?: string
    treatmentPlanId?: string
    successUrl?: string
    cancelUrl?: string
  }): Promise<{ url: string }> {
    const { createCheckoutSession } = await import('@/entities/payment/api/payment-api')
    return createCheckoutSession(input)
  }

  async createPaymentIntent(_intent: PaymentIntent): Promise<{ clientSecret: string }> {
    return { clientSecret: 'stripe_via_checkout' }
  }

  async confirmPayment(_paymentId: string): Promise<{ status: string }> {
    return { status: 'pending' }
  }
}

export const paymentProvider: PaymentProvider = new StripePaymentProvider()
