-- Payments table

CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_patient ON payments (patient_id);
CREATE INDEX idx_payments_stripe ON payments (stripe_payment_intent_id);

CREATE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
