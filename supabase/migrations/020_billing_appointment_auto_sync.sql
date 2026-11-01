-- Auto-sync billing charges when appointments are created, rescheduled, or cancelled.

CREATE OR REPLACE FUNCTION private.ensure_session_billing_charge(p_appointment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt appointments%ROWTYPE;
  v_agreement patient_billing_agreements%ROWTYPE;
  v_day DATE;
  v_amount INTEGER;
  v_desc TEXT;
  v_existing UUID;
BEGIN
  SELECT * INTO v_appt FROM appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_appt.status IN ('cancelled', 'no_show') THEN
    RETURN;
  END IF;

  SELECT * INTO v_agreement
  FROM patient_billing_agreements
  WHERE patient_id = v_appt.patient_id
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_day := (v_appt.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_amount := COALESCE(v_appt.price_cents, v_agreement.session_price_cents);
  v_desc := 'Sessão ' || to_char(v_appt.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');

  SELECT id INTO v_existing
  FROM patient_billing_charges
  WHERE appointment_id = v_appt.id
    AND kind = 'session'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE patient_billing_charges
    SET
      description = v_desc,
      period_start = private.week_start(v_day),
      period_end = private.week_end(v_day),
      due_date = v_day,
      amount_cents = CASE
        WHEN amount_paid_cents = 0 AND status = 'open' THEN v_amount
        ELSE amount_cents
      END,
      agreement_id = COALESCE(agreement_id, v_agreement.id)
    WHERE id = v_existing;
    RETURN;
  END IF;

  INSERT INTO patient_billing_charges (
    patient_id,
    physiotherapist_id,
    agreement_id,
    appointment_id,
    kind,
    description,
    period_start,
    period_end,
    amount_cents,
    amount_paid_cents,
    status,
    due_date
  ) VALUES (
    v_appt.patient_id,
    v_appt.physiotherapist_id,
    v_agreement.id,
    v_appt.id,
    'session',
    v_desc,
    private.week_start(v_day),
    private.week_end(v_day),
    v_amount,
    0,
    'open',
    v_day
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.clear_session_billing_charge(p_appointment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Unpaid open charges: remove (session no longer billable)
  DELETE FROM patient_billing_charges
  WHERE appointment_id = p_appointment_id
    AND kind = 'session'
    AND status = 'open'
    AND amount_paid_cents = 0;
END;
$$;

CREATE OR REPLACE FUNCTION private.trg_appointments_billing_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('cancelled', 'no_show') THEN
      PERFORM private.ensure_session_billing_charge(NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IN ('cancelled', 'no_show')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM private.clear_session_billing_charge(NEW.id);
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('cancelled', 'no_show') THEN
    IF OLD.status IN ('cancelled', 'no_show')
       OR OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
       OR OLD.price_cents IS DISTINCT FROM NEW.price_cents
       OR OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM private.ensure_session_billing_charge(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_billing_sync ON appointments;
CREATE TRIGGER trg_appointments_billing_sync
  AFTER INSERT OR UPDATE OF status, scheduled_at, price_cents
  ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_appointments_billing_sync();

-- When a billing agreement is saved/activated, backfill charges for existing appointments
CREATE OR REPLACE FUNCTION private.trg_billing_agreement_backfill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt_id UUID;
BEGIN
  IF NEW.is_active IS TRUE THEN
    FOR v_appt_id IN
      SELECT id FROM appointments
      WHERE patient_id = NEW.patient_id
        AND physiotherapist_id = NEW.physiotherapist_id
        AND status NOT IN ('cancelled', 'no_show')
    LOOP
      PERFORM private.ensure_session_billing_charge(v_appt_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_agreement_backfill ON patient_billing_agreements;
CREATE TRIGGER trg_billing_agreement_backfill
  AFTER INSERT OR UPDATE OF is_active, session_price_cents, billing_mode
  ON patient_billing_agreements
  FOR EACH ROW
  EXECUTE FUNCTION private.trg_billing_agreement_backfill();
