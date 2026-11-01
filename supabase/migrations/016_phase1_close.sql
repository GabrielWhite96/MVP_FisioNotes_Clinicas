-- Phase 1 close (V1.2): telehealth sessions, exercise library enrichment,
-- recovery packages/invoices, discharge status, caregiver invites, consent expires

-- ─── Treatment plan discharge ───────────────────────────────────────────────
ALTER TYPE treatment_plan_status ADD VALUE IF NOT EXISTS 'discharged';

-- ─── Telehealth sessions ────────────────────────────────────────────────────
CREATE TYPE telehealth_session_status AS ENUM (
  'created', 'joined', 'in_progress', 'ended', 'failed'
);

CREATE TABLE telehealth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'daily',
  room_name TEXT,
  room_url TEXT,
  status telehealth_session_status NOT NULL DEFAULT 'created',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telehealth_sessions_appointment ON telehealth_sessions (appointment_id);

CREATE TRIGGER set_updated_at_telehealth_sessions
  BEFORE UPDATE ON telehealth_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Exercise library enrichment ────────────────────────────────────────────
ALTER TABLE exercise_library
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS contraindications TEXT,
  ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON exercise_library (category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_active ON exercise_library (is_active);

-- ─── Recovery packages + invoices ───────────────────────────────────────────
CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
CREATE TYPE package_purchase_status AS ENUM ('pending', 'active', 'exhausted', 'cancelled');

CREATE TABLE recovery_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER NOT NULL DEFAULT 8,
  home_visits_included INTEGER NOT NULL DEFAULT 0,
  virtual_sessions_included INTEGER NOT NULL DEFAULT 0,
  exercise_monitoring BOOLEAN NOT NULL DEFAULT true,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES recovery_packages(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  status package_purchase_status NOT NULL DEFAULT 'pending',
  home_visits_used INTEGER NOT NULL DEFAULT 0,
  virtual_sessions_used INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  package_purchase_id UUID REFERENCES package_purchases(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CAD',
  status invoice_status NOT NULL DEFAULT 'open',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES recovery_packages(id) ON DELETE SET NULL;

CREATE INDEX idx_package_purchases_patient ON package_purchases (patient_id, status);
CREATE INDEX idx_invoices_patient ON invoices (patient_id, status);

CREATE TRIGGER set_updated_at_recovery_packages
  BEFORE UPDATE ON recovery_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_package_purchases
  BEFORE UPDATE ON package_purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO recovery_packages (
  code, name, description, duration_weeks,
  home_visits_included, virtual_sessions_included,
  exercise_monitoring, price_cents, currency
) VALUES (
  'recovery-8w',
  'Recovery Program 8 weeks',
  '4 home visits, 6 virtual sessions and exercise monitoring',
  8, 4, 6, true, 99900, 'CAD'
) ON CONFLICT (code) DO NOTHING;

-- ─── Caregiver invites ──────────────────────────────────────────────────────
CREATE TYPE caregiver_invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE caregiver_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  permissions JSONB NOT NULL DEFAULT '{"view_progress":true,"view_appointments":true,"view_exercises":true,"view_clinical_records":false}'::jsonb,
  status caregiver_invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_caregiver_invites_pending_email
  ON caregiver_invites (patient_id, lower(email))
  WHERE status = 'pending';

CREATE TRIGGER set_updated_at_caregiver_invites
  BEFORE UPDATE ON caregiver_invites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Consent versioning ─────────────────────────────────────────────────────
ALTER TABLE consents
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.current_consent_version()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '1.1'::text;
$$;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE telehealth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telehealth_sessions_select" ON telehealth_sessions FOR SELECT USING (
  private.is_admin() OR EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = telehealth_sessions.appointment_id
      AND (
        private.is_own_patient(a.patient_id)
        OR private.physio_has_patient(a.patient_id)
      )
  )
);
CREATE POLICY "telehealth_sessions_insert" ON telehealth_sessions FOR INSERT WITH CHECK (
  private.is_admin() OR EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = telehealth_sessions.appointment_id
      AND (
        private.is_own_patient(a.patient_id)
        OR private.physio_has_patient(a.patient_id)
      )
  )
);
CREATE POLICY "telehealth_sessions_update" ON telehealth_sessions FOR UPDATE USING (
  private.is_admin() OR EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = telehealth_sessions.appointment_id
      AND (
        private.is_own_patient(a.patient_id)
        OR private.physio_has_patient(a.patient_id)
      )
  )
);

CREATE POLICY "recovery_packages_select" ON recovery_packages FOR SELECT USING (
  is_active OR private.is_admin()
);
CREATE POLICY "recovery_packages_admin" ON recovery_packages FOR ALL USING (private.is_admin());

CREATE POLICY "package_purchases_select" ON package_purchases FOR SELECT USING (
  private.is_admin() OR private.is_own_patient(patient_id) OR private.physio_has_patient(patient_id)
  OR private.caregiver_has_patient(patient_id)
);
CREATE POLICY "package_purchases_insert" ON package_purchases FOR INSERT WITH CHECK (
  private.is_admin() OR private.is_own_patient(patient_id)
);
CREATE POLICY "package_purchases_update" ON package_purchases FOR UPDATE USING (
  private.is_admin() OR private.is_own_patient(patient_id)
);

CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (
  private.is_admin() OR private.is_own_patient(patient_id)
);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (
  private.is_admin() OR private.is_own_patient(patient_id)
);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (
  private.is_admin() OR private.is_own_patient(patient_id)
);

CREATE POLICY "caregiver_invites_select" ON caregiver_invites FOR SELECT USING (
  private.is_admin()
  OR private.is_own_patient(patient_id)
  OR invited_by = auth.uid()
  OR accepted_profile_id = auth.uid()
  OR (
    private.get_user_role() = 'caregiver'
    AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);
CREATE POLICY "caregiver_invites_insert" ON caregiver_invites FOR INSERT WITH CHECK (
  private.is_admin() OR private.is_own_patient(patient_id)
);
CREATE POLICY "caregiver_invites_update" ON caregiver_invites FOR UPDATE USING (
  private.is_admin()
  OR private.is_own_patient(patient_id)
  OR (
    private.get_user_role() = 'caregiver'
    AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
);

-- Storage bucket for exercise videos (public read of public objects; write for staff)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-videos',
  'exercise-videos',
  true,
  52428800,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "exercise_videos_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'exercise-videos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exercise_videos_staff_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'exercise-videos'
      AND private.get_user_role() IN ('physiotherapist', 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exercise_videos_staff_update"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'exercise-videos'
      AND private.get_user_role() IN ('physiotherapist', 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "exercise_videos_staff_delete"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'exercise-videos'
      AND private.get_user_role() IN ('physiotherapist', 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
