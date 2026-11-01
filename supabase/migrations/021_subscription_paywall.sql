-- Paywall: free physio signup, clinic access only with active Stripe subscription

ALTER TABLE physiotherapists
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_physiotherapists_stripe_customer
  ON physiotherapists (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_physiotherapists_stripe_subscription
  ON physiotherapists (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE physiotherapists
  ALTER COLUMN subscription_status SET DEFAULT 'inactive';

-- Existing never-expiring trials must not keep writable access
UPDATE physiotherapists
SET
  subscription_status = 'inactive',
  trial_ends_at = NULL
WHERE subscription_status = 'trialing';

CREATE OR REPLACE FUNCTION private.physio_has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.physiotherapists p
    WHERE p.profile_id = auth.uid()
      AND p.subscription_status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION private.physio_has_active_subscription() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.physio_has_active_subscription() TO authenticated;

-- New physiotherapists start inactive (no free trial)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_full_name TEXT;
  v_invite_token TEXT;
  v_invite patient_invites%ROWTYPE;
  v_meta_role TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';
  v_meta_role := NEW.raw_user_meta_data->>'role';

  IF v_invite_token IS NOT NULL AND length(v_invite_token) > 0 THEN
    SELECT * INTO v_invite
    FROM patient_invites
    WHERE invite_token = v_invite_token
      AND status = 'pending'
      AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or expired patient invite';
    END IF;

    IF lower(v_invite.email) <> lower(NEW.email) THEN
      RAISE EXCEPTION 'Invite email does not match signup email';
    END IF;

    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (
      NEW.id,
      'patient',
      COALESCE(v_full_name, (SELECT full_name FROM patients WHERE id = v_invite.patient_id)),
      NULL
    );

    UPDATE public.patients
    SET
      profile_id = NEW.id,
      account_status = 'active',
      full_name = COALESCE(patients.full_name, v_full_name),
      email = COALESCE(patients.email, NEW.email),
      updated_at = now()
    WHERE id = v_invite.patient_id;

    UPDATE public.patient_invites
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_profile_id = NEW.id,
      updated_at = now()
    WHERE id = v_invite.id;

    INSERT INTO public.care_relationships (patient_id, physiotherapist_id)
    VALUES (v_invite.patient_id, v_invite.physiotherapist_id)
    ON CONFLICT (patient_id, physiotherapist_id) DO UPDATE
      SET ended_at = NULL, updated_at = now();

    RETURN NEW;
  END IF;

  IF v_meta_role = 'caregiver' THEN
    IF EXISTS (
      SELECT 1 FROM caregiver_invites ci
      WHERE lower(ci.email) = lower(NEW.email)
        AND ci.status = 'pending'
        AND ci.expires_at > now()
    ) THEN
      INSERT INTO public.profiles (id, role, full_name)
      VALUES (NEW.id, 'caregiver', v_full_name);
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Caregiver signup requires a valid invite';
  END IF;

  v_role := 'physiotherapist';

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, v_role, v_full_name);

  INSERT INTO public.physiotherapists (
    profile_id,
    modalities,
    subscription_status,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    ARRAY['telehealth', 'home_visit']::appointment_modality[],
    'inactive',
    NULL
  );

  RETURN NEW;
END;
$$;

-- Prevent physios from self-activating subscription fields
CREATE OR REPLACE FUNCTION public.protect_physiotherapist_billing_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR private.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.subscription_status := OLD.subscription_status;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_physiotherapist_billing_fields ON physiotherapists;
CREATE TRIGGER protect_physiotherapist_billing_fields
  BEFORE UPDATE ON physiotherapists
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_physiotherapist_billing_fields();

-- Prevent privilege escalation via profiles.role
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR private.is_admin() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Changing profile role is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON profiles;
CREATE TRIGGER protect_profile_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- ─── Write policies require active subscription for physiotherapists ────────

DROP POLICY IF EXISTS "patients_insert" ON patients;
CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "patients_update" ON patients;
CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    profile_id = auth.uid()
    OR private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments
  FOR UPDATE USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "clinical_records_insert" ON clinical_records;
CREATE POLICY "clinical_records_insert" ON clinical_records
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "clinical_records_update" ON clinical_records;
CREATE POLICY "clinical_records_update" ON clinical_records
  FOR UPDATE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "patient_exercises_insert" ON patient_exercises;
CREATE POLICY "patient_exercises_insert" ON patient_exercises
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "patient_exercises_update" ON patient_exercises;
CREATE POLICY "patient_exercises_update" ON patient_exercises
  FOR UPDATE USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "exercise_library_manage" ON exercise_library;
CREATE POLICY "exercise_library_manage" ON exercise_library
  FOR ALL USING (
    private.is_admin()
    OR (
      created_by = auth.uid()
      AND private.physio_has_active_subscription()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      created_by = auth.uid()
      AND private.physio_has_active_subscription()
    )
  );

DROP POLICY IF EXISTS "availability_manage_own" ON availability;
CREATE POLICY "availability_manage_own" ON availability
  FOR ALL USING (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND EXISTS (
        SELECT 1 FROM physiotherapists p
        WHERE p.id = availability.physiotherapist_id
          AND p.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND EXISTS (
        SELECT 1 FROM physiotherapists p
        WHERE p.id = availability.physiotherapist_id
          AND p.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "availability_blocks_manage" ON availability_blocks;
CREATE POLICY "availability_blocks_manage" ON availability_blocks
  FOR ALL USING (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND EXISTS (
        SELECT 1 FROM physiotherapists p
        WHERE p.id = availability_blocks.physiotherapist_id
          AND p.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND EXISTS (
        SELECT 1 FROM physiotherapists p
        WHERE p.id = availability_blocks.physiotherapist_id
          AND p.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "treatment_plans_insert" ON treatment_plans;
CREATE POLICY "treatment_plans_insert" ON treatment_plans
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "treatment_plans_update" ON treatment_plans;
CREATE POLICY "treatment_plans_update" ON treatment_plans
  FOR UPDATE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "treatment_goals_manage" ON treatment_goals;
CREATE POLICY "treatment_goals_manage" ON treatment_goals
  FOR ALL USING (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND EXISTS (
        SELECT 1 FROM treatment_plans tp
        WHERE tp.id = treatment_goals.treatment_plan_id
          AND private.physio_has_patient(tp.patient_id)
      )
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND EXISTS (
        SELECT 1 FROM treatment_plans tp
        WHERE tp.id = treatment_goals.treatment_plan_id
          AND private.physio_has_patient(tp.patient_id)
      )
    )
  );

DROP POLICY IF EXISTS "patient_invites_insert" ON patient_invites;
CREATE POLICY "patient_invites_insert" ON patient_invites
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "patient_invites_update" ON patient_invites;
CREATE POLICY "patient_invites_update" ON patient_invites
  FOR UPDATE USING (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.physio_has_active_subscription()
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "billing_agreements_insert" ON patient_billing_agreements;
CREATE POLICY "billing_agreements_insert" ON patient_billing_agreements
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "billing_agreements_update" ON patient_billing_agreements;
CREATE POLICY "billing_agreements_update" ON patient_billing_agreements
  FOR UPDATE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "billing_agreements_delete" ON patient_billing_agreements;
CREATE POLICY "billing_agreements_delete" ON patient_billing_agreements
  FOR DELETE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "billing_charges_insert" ON patient_billing_charges;
CREATE POLICY "billing_charges_insert" ON patient_billing_charges
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "billing_charges_update" ON patient_billing_charges;
CREATE POLICY "billing_charges_update" ON patient_billing_charges
  FOR UPDATE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "billing_charges_delete" ON patient_billing_charges;
CREATE POLICY "billing_charges_delete" ON patient_billing_charges
  FOR DELETE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "payment_receipts_insert" ON patient_payment_receipts;
CREATE POLICY "payment_receipts_insert" ON patient_payment_receipts
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "payment_receipts_update" ON patient_payment_receipts;
CREATE POLICY "payment_receipts_update" ON patient_payment_receipts
  FOR UPDATE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );
