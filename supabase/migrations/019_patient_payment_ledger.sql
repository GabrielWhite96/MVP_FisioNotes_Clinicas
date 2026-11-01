-- Manual payment ledger for physiotherapists (no online checkout).
-- Agreement → charges (expected) → receipts (received) → allocations (debit).

CREATE TYPE billing_mode AS ENUM ('per_session', 'weekly');
CREATE TYPE payment_method_kind AS ENUM ('pix', 'cash', 'other');
CREATE TYPE billing_charge_kind AS ENUM ('session', 'manual', 'adjustment');
CREATE TYPE billing_charge_status AS ENUM ('open', 'partial', 'paid', 'waived');

-- Default billing terms per patient
CREATE TABLE patient_billing_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  billing_mode billing_mode NOT NULL DEFAULT 'per_session',
  session_price_cents INTEGER NOT NULL CHECK (session_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  preferred_method payment_method_kind,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_billing_agreements_one_active
  ON patient_billing_agreements (patient_id)
  WHERE is_active = true;

CREATE INDEX idx_billing_agreements_physio
  ON patient_billing_agreements (physiotherapist_id);

-- Expected amounts (debts) — usually one per session
CREATE TABLE patient_billing_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES patient_billing_agreements(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  kind billing_charge_kind NOT NULL DEFAULT 'session',
  description TEXT,
  period_start DATE,
  period_end DATE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  amount_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  status billing_charge_status NOT NULL DEFAULT 'open',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_charges_paid_lte_amount CHECK (amount_paid_cents <= amount_cents)
);

CREATE UNIQUE INDEX idx_billing_charges_appointment_unique
  ON patient_billing_charges (appointment_id)
  WHERE appointment_id IS NOT NULL AND kind = 'session';

CREATE INDEX idx_billing_charges_patient_status
  ON patient_billing_charges (patient_id, status);

CREATE INDEX idx_billing_charges_physio_period
  ON patient_billing_charges (physiotherapist_id, period_start, period_end);

CREATE INDEX idx_billing_charges_open
  ON patient_billing_charges (patient_id, due_date)
  WHERE status IN ('open', 'partial');

-- Money actually received (manual register)
CREATE TABLE patient_payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method payment_method_kind NOT NULL DEFAULT 'pix',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_receipts_patient
  ON patient_payment_receipts (patient_id, paid_at DESC);

CREATE INDEX idx_payment_receipts_physio
  ON patient_payment_receipts (physiotherapist_id, paid_at DESC);

-- How a receipt debits one or more charges
CREATE TABLE patient_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES patient_payment_receipts(id) ON DELETE CASCADE,
  charge_id UUID NOT NULL REFERENCES patient_billing_charges(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_allocations_unique UNIQUE (receipt_id, charge_id)
);

CREATE INDEX idx_payment_allocations_charge
  ON patient_payment_allocations (charge_id);

CREATE TRIGGER set_updated_at_billing_agreements
  BEFORE UPDATE ON patient_billing_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_billing_charges
  BEFORE UPDATE ON patient_billing_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_payment_receipts
  BEFORE UPDATE ON patient_payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep charge paid totals / status in sync with allocations
CREATE OR REPLACE FUNCTION private.refresh_billing_charge_paid(p_charge_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid INTEGER;
  v_amount INTEGER;
  v_status billing_charge_status;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_paid
  FROM patient_payment_allocations
  WHERE charge_id = p_charge_id;

  SELECT amount_cents, status INTO v_amount, v_status
  FROM patient_billing_charges
  WHERE id = p_charge_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_status = 'waived' THEN
    UPDATE patient_billing_charges
    SET amount_paid_cents = v_paid
    WHERE id = p_charge_id;
    RETURN;
  END IF;

  UPDATE patient_billing_charges
  SET
    amount_paid_cents = v_paid,
    status = CASE
      WHEN v_paid <= 0 THEN 'open'::billing_charge_status
      WHEN v_paid >= v_amount THEN 'paid'::billing_charge_status
      ELSE 'partial'::billing_charge_status
    END
  WHERE id = p_charge_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.trg_refresh_charge_from_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.refresh_billing_charge_paid(OLD.charge_id);
    RETURN OLD;
  END IF;

  PERFORM private.refresh_billing_charge_paid(NEW.charge_id);
  IF TG_OP = 'UPDATE' AND OLD.charge_id IS DISTINCT FROM NEW.charge_id THEN
    PERFORM private.refresh_billing_charge_paid(OLD.charge_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_allocations_refresh_charge
  AFTER INSERT OR UPDATE OR DELETE ON patient_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION private.trg_refresh_charge_from_allocation();

-- Monday-start week helpers (UTC date of appointment local calendar day is fine for MVP)
CREATE OR REPLACE FUNCTION private.week_start(d DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT d - ((EXTRACT(ISODOW FROM d)::INTEGER - 1));
$$;

CREATE OR REPLACE FUNCTION private.week_end(d DATE)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT private.week_start(d) + 6;
$$;

ALTER TABLE patient_billing_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_billing_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_payment_allocations ENABLE ROW LEVEL SECURITY;

-- Agreements: physio only (patient should not see internal money tracking in this MVP)
CREATE POLICY "billing_agreements_select" ON patient_billing_agreements FOR SELECT USING (
  private.is_admin()
  OR (private.get_user_role() = 'physiotherapist' AND private.physio_has_patient(patient_id))
);
CREATE POLICY "billing_agreements_insert" ON patient_billing_agreements FOR INSERT WITH CHECK (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);
CREATE POLICY "billing_agreements_update" ON patient_billing_agreements FOR UPDATE USING (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);
CREATE POLICY "billing_agreements_delete" ON patient_billing_agreements FOR DELETE USING (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);

CREATE POLICY "billing_charges_select" ON patient_billing_charges FOR SELECT USING (
  private.is_admin()
  OR (private.get_user_role() = 'physiotherapist' AND private.physio_has_patient(patient_id))
);
CREATE POLICY "billing_charges_insert" ON patient_billing_charges FOR INSERT WITH CHECK (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);
CREATE POLICY "billing_charges_update" ON patient_billing_charges FOR UPDATE USING (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);
CREATE POLICY "billing_charges_delete" ON patient_billing_charges FOR DELETE USING (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);

CREATE POLICY "payment_receipts_select" ON patient_payment_receipts FOR SELECT USING (
  private.is_admin()
  OR (private.get_user_role() = 'physiotherapist' AND private.physio_has_patient(patient_id))
);
CREATE POLICY "payment_receipts_insert" ON patient_payment_receipts FOR INSERT WITH CHECK (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);
CREATE POLICY "payment_receipts_update" ON patient_payment_receipts FOR UPDATE USING (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);
CREATE POLICY "payment_receipts_delete" ON patient_payment_receipts FOR DELETE USING (
  private.is_admin()
  OR (
    private.get_user_role() = 'physiotherapist'
    AND private.physio_has_patient(patient_id)
    AND physiotherapist_id = private.get_physiotherapist_id_for_user()
  )
);

CREATE POLICY "payment_allocations_select" ON patient_payment_allocations FOR SELECT USING (
  private.is_admin()
  OR EXISTS (
    SELECT 1 FROM patient_payment_receipts r
    WHERE r.id = receipt_id
      AND private.physio_has_patient(r.patient_id)
  )
);
CREATE POLICY "payment_allocations_insert" ON patient_payment_allocations FOR INSERT WITH CHECK (
  private.is_admin()
  OR EXISTS (
    SELECT 1 FROM patient_payment_receipts r
    WHERE r.id = receipt_id
      AND r.physiotherapist_id = private.get_physiotherapist_id_for_user()
      AND private.physio_has_patient(r.patient_id)
  )
);
CREATE POLICY "payment_allocations_delete" ON patient_payment_allocations FOR DELETE USING (
  private.is_admin()
  OR EXISTS (
    SELECT 1 FROM patient_payment_receipts r
    WHERE r.id = receipt_id
      AND r.physiotherapist_id = private.get_physiotherapist_id_for_user()
      AND private.physio_has_patient(r.patient_id)
  )
);
