-- SaaS physio ownership: individual physio accounts, invite-only patients, drop organizations

-- ─── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE patient_clinical_status AS ENUM (
  'awaiting_assessment',
  'in_treatment',
  'paused',
  'reassessment',
  'discharged'
);

CREATE TYPE patient_account_status AS ENUM (
  'no_account',
  'invite_pending',
  'active'
);

CREATE TYPE saas_subscription_status AS ENUM (
  'trialing',
  'active',
  'inactive'
);

CREATE TYPE patient_invite_status AS ENUM (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

-- ─── Physiotherapists: SaaS subscription prep ───────────────────────────────
ALTER TABLE physiotherapists
  ADD COLUMN IF NOT EXISTS subscription_status saas_subscription_status NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');

-- ─── Patients: ownership + contact + statuses ───────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS physiotherapist_id UUID REFERENCES physiotherapists(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS clinical_status patient_clinical_status NOT NULL DEFAULT 'awaiting_assessment',
  ADD COLUMN IF NOT EXISTS account_status patient_account_status NOT NULL DEFAULT 'no_account';

-- Backfill contact from profiles
UPDATE patients p
SET
  full_name = COALESCE(p.full_name, pr.full_name, 'Paciente'),
  phone = COALESCE(p.phone, pr.phone),
  email = COALESCE(p.email, au.email),
  account_status = CASE WHEN p.profile_id IS NOT NULL THEN 'active'::patient_account_status ELSE 'no_account'::patient_account_status END
FROM profiles pr
LEFT JOIN auth.users au ON au.id = pr.id
WHERE pr.id = p.profile_id;

UPDATE patients SET full_name = COALESCE(NULLIF(trim(full_name), ''), 'Paciente') WHERE full_name IS NULL OR trim(full_name) = '';

-- Backfill physiotherapist_id from care_relationships (prefer active)
UPDATE patients p
SET physiotherapist_id = sub.physiotherapist_id
FROM (
  SELECT DISTINCT ON (cr.patient_id)
    cr.patient_id,
    cr.physiotherapist_id
  FROM care_relationships cr
  ORDER BY cr.patient_id, (cr.ended_at IS NULL) DESC, cr.started_at DESC
) sub
WHERE p.id = sub.patient_id
  AND p.physiotherapist_id IS NULL;

-- Orphan patients without any physio link cannot exist in SaaS model
DELETE FROM patients WHERE physiotherapist_id IS NULL;

UPDATE patients SET full_name = COALESCE(NULLIF(trim(full_name), ''), 'Paciente') WHERE full_name IS NULL OR trim(full_name) = '';

ALTER TABLE patients
  ALTER COLUMN physiotherapist_id SET NOT NULL,
  ALTER COLUMN full_name SET NOT NULL;

-- Make profile_id nullable (patient can exist before account activation)
ALTER TABLE patients ALTER COLUMN profile_id DROP NOT NULL;

-- Replace FK so deleting auth user does not cascade-delete clinical patient
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_profile_id_fkey;
ALTER TABLE patients
  ADD CONSTRAINT patients_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_physiotherapist ON patients (physiotherapist_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinical_status ON patients (physiotherapist_id, clinical_status);
CREATE INDEX IF NOT EXISTS idx_patients_account_status ON patients (physiotherapist_id, account_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_physio_email
  ON patients (physiotherapist_id, lower(email))
  WHERE email IS NOT NULL;

-- ─── Patient invites ────────────────────────────────────────────────────────
CREATE TABLE patient_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status patient_invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_patient_invites_pending_patient
  ON patient_invites (patient_id)
  WHERE status = 'pending';

CREATE INDEX idx_patient_invites_token ON patient_invites (invite_token);

CREATE TRIGGER set_updated_at_patient_invites
  BEFORE UPDATE ON patient_invites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Drop organizations ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "organizations_admin_all" ON organizations;
DROP TRIGGER IF EXISTS set_updated_at_organizations ON organizations;

ALTER TABLE profiles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE patients DROP COLUMN IF EXISTS organization_id;
ALTER TABLE physiotherapists DROP COLUMN IF EXISTS organization_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS organization_id;
ALTER TABLE treatment_plans DROP COLUMN IF EXISTS organization_id;

DROP TABLE IF EXISTS organizations;

-- ─── Strengthen physio_has_patient ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.physio_has_patient(p_patient_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients pt
    JOIN public.physiotherapists ph ON ph.id = pt.physiotherapist_id
    WHERE pt.id = p_patient_id
      AND ph.profile_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.care_relationships cr
    JOIN public.physiotherapists p ON p.id = cr.physiotherapist_id
    WHERE cr.patient_id = p_patient_id
      AND p.profile_id = auth.uid()
      AND cr.ended_at IS NULL
  );
$$;

-- ─── handle_new_user: physio public signup + patient invite link ────────────
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

  -- Patient activation via invite
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
    VALUES (NEW.id, 'patient', COALESCE(v_full_name, (SELECT full_name FROM patients WHERE id = v_invite.patient_id)), NULL);

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

  -- Caregiver: only if pending caregiver invite for this email
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

  -- Public signup is physiotherapist-only
  IF v_meta_role = 'admin' OR v_meta_role = 'patient' THEN
    v_role := 'physiotherapist';
  ELSE
    v_role := 'physiotherapist';
  END IF;

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
    'trialing',
    now() + interval '14 days'
  );

  RETURN NEW;
END;
$$;

-- Auto care_relationship when physio creates a patient
CREATE OR REPLACE FUNCTION public.create_care_relationship_on_patient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.care_relationships (patient_id, physiotherapist_id)
  VALUES (NEW.id, NEW.physiotherapist_id)
  ON CONFLICT (patient_id, physiotherapist_id) DO UPDATE
    SET ended_at = NULL, updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_patient_created_care_relationship ON patients;
CREATE TRIGGER on_patient_created_care_relationship
  AFTER INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION public.create_care_relationship_on_patient();

-- Notify: skip patient notification when no account yet
CREATE OR REPLACE FUNCTION public.notify_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_profile UUID;
  v_physio_profile UUID;
BEGIN
  SELECT profile_id INTO v_patient_profile FROM patients WHERE id = NEW.patient_id;
  SELECT profile_id INTO v_physio_profile FROM physiotherapists WHERE id = NEW.physiotherapist_id;

  IF v_patient_profile IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      v_patient_profile,
      'appointment_confirmed',
      'Consulta agendada',
      'Sua consulta foi agendada com sucesso.',
      jsonb_build_object('appointment_id', NEW.id)
    );
  END IF;

  IF v_physio_profile IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      v_physio_profile,
      'appointment_confirmed',
      'Nova consulta',
      'Uma nova consulta foi agendada.',
      jsonb_build_object('appointment_id', NEW.id)
    );
  END IF;

  PERFORM public.log_audit_event(
    'APPOINTMENT_CREATED',
    'appointments',
    NEW.id,
    jsonb_build_object('modality', NEW.modality, 'scheduled_at', NEW.scheduled_at)
  );

  RETURN NEW;
END;
$$;

-- Evaluation reminders: use patient.full_name when profile missing
CREATE OR REPLACE FUNCTION public.send_evaluation_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT
      cr.id,
      cr.patient_id,
      cr.next_evaluation_at,
      ph.profile_id AS physio_profile,
      COALESCE(p.full_name, p_profile.full_name, 'paciente') AS patient_name
    FROM clinical_records cr
    JOIN physiotherapists ph ON ph.id = cr.physiotherapist_id
    JOIN patients p ON p.id = cr.patient_id
    LEFT JOIN profiles p_profile ON p_profile.id = p.profile_id
    WHERE cr.next_evaluation_at IS NOT NULL
      AND cr.next_evaluation_at BETWEEN now() AND now() + interval '25 hours'
      AND cr.record_type IN ('initial_assessment', 'reassessment')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.metadata->>'clinical_record_id' = cr.id::text
          AND n.type = 'evaluation_due'
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      r.physio_profile,
      'evaluation_due',
      'Lembrete de reavaliação',
      'Reavaliação prevista para ' || to_char(r.next_evaluation_at AT TIME ZONE 'UTC', 'DD/MM/YYYY') || ' — ' || r.patient_name || '.',
      jsonb_build_object(
        'clinical_record_id', r.id,
        'patient_id', r.patient_id
      )
    );
  END LOOP;
END;
$$;

-- Public invite lookup (safe fields only)
CREATE OR REPLACE FUNCTION public.get_patient_invite_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  email TEXT,
  status patient_invite_status,
  expires_at TIMESTAMPTZ,
  patient_full_name TEXT,
  physiotherapist_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.patient_id,
    pi.email,
    CASE
      WHEN pi.status = 'pending' AND pi.expires_at <= now() THEN 'expired'::patient_invite_status
      ELSE pi.status
    END,
    pi.expires_at,
    p.full_name,
    pr.full_name
  FROM patient_invites pi
  JOIN patients p ON p.id = pi.patient_id
  JOIN physiotherapists ph ON ph.id = pi.physiotherapist_id
  JOIN profiles pr ON pr.id = ph.profile_id
  WHERE pi.invite_token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_invite_by_token(TEXT) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_evaluation_reminders() FROM PUBLIC, anon, authenticated;

-- ─── RLS updates ────────────────────────────────────────────────────────────
ALTER TABLE patient_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patients_select" ON patients;
DROP POLICY IF EXISTS "patients_update_own" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;

CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (
    profile_id = auth.uid()
    OR private.is_admin()
    OR private.physio_has_patient(id)
    OR private.caregiver_has_patient(id)
  );

CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    profile_id = auth.uid()
    OR private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
    )
  );

DROP POLICY IF EXISTS "physiotherapists_select" ON physiotherapists;
CREATE POLICY "physiotherapists_select" ON physiotherapists
  FOR SELECT USING (
    profile_id = auth.uid()
    OR private.is_admin()
    OR EXISTS (
      SELECT 1 FROM patients pt
      WHERE pt.physiotherapist_id = physiotherapists.id
        AND pt.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM patient_caregiver_links pcl
      JOIN patients pt ON pt.id = pcl.patient_id
      WHERE pt.physiotherapist_id = physiotherapists.id
        AND pcl.caregiver_profile_id = auth.uid()
        AND pcl.revoked_at IS NULL
    )
  );

DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND physiotherapist_id = private.get_physiotherapist_id_for_user()
      AND private.physio_has_patient(patient_id)
    )
  );

DROP POLICY IF EXISTS "availability_select" ON availability;
CREATE POLICY "availability_select" ON availability
  FOR SELECT USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = availability.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM patients pt
      WHERE pt.physiotherapist_id = availability.physiotherapist_id
        AND pt.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "availability_blocks_select" ON availability_blocks;
CREATE POLICY "availability_blocks_select" ON availability_blocks
  FOR SELECT USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = availability_blocks.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM patients pt
      WHERE pt.physiotherapist_id = availability_blocks.physiotherapist_id
        AND pt.profile_id = auth.uid()
    )
  );

-- Profiles: physio can see owned patients' profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND EXISTS (
        SELECT 1 FROM patients pt
        WHERE pt.profile_id = profiles.id
          AND pt.physiotherapist_id = private.get_physiotherapist_id_for_user()
      )
    )
    OR (
      private.get_user_role() = 'patient'
      AND EXISTS (
        SELECT 1 FROM physiotherapists ph
        JOIN patients pt ON pt.physiotherapist_id = ph.id
        WHERE ph.profile_id = profiles.id
          AND pt.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "patient_invites_select" ON patient_invites
  FOR SELECT USING (
    private.is_admin()
    OR physiotherapist_id = private.get_physiotherapist_id_for_user()
  );

CREATE POLICY "patient_invites_insert" ON patient_invites
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      physiotherapist_id = private.get_physiotherapist_id_for_user()
      AND private.physio_has_patient(patient_id)
    )
  );

CREATE POLICY "patient_invites_update" ON patient_invites
  FOR UPDATE USING (
    private.is_admin()
    OR physiotherapist_id = private.get_physiotherapist_id_for_user()
  );

-- Exercise library: keep accessible to authenticated physios/patients (scoped roles)
DROP POLICY IF EXISTS "exercise_library_select" ON exercise_library;
CREATE POLICY "exercise_library_select" ON exercise_library
  FOR SELECT USING (
    private.is_admin()
    OR private.get_user_role() IN ('patient', 'physiotherapist', 'caregiver')
  );
