-- Helper functions in private schema (not exposed via API)

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.get_patient_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.patients WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.get_physiotherapist_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.physiotherapists WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.physio_has_patient(p_patient_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.care_relationships cr
    JOIN public.physiotherapists p ON p.id = cr.physiotherapist_id
    WHERE cr.patient_id = p_patient_id
      AND p.profile_id = auth.uid()
      AND cr.ended_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION private.is_own_patient(p_patient_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients
    WHERE id = p_patient_id AND profile_id = auth.uid()
  );
$$;

-- Enable RLS on all tables

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE physiotherapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations (admin only)
CREATE POLICY "organizations_admin_all" ON organizations
  FOR ALL USING (private.is_admin());

-- Profiles
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND EXISTS (
        SELECT 1 FROM care_relationships cr
        JOIN patients pt ON pt.id = cr.patient_id
        WHERE pt.profile_id = profiles.id
          AND cr.physiotherapist_id = private.get_physiotherapist_id_for_user()
          AND cr.ended_at IS NULL
      )
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() OR private.is_admin());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Patients
CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (
    profile_id = auth.uid()
    OR private.is_admin()
    OR private.physio_has_patient(id)
  );

CREATE POLICY "patients_update_own" ON patients
  FOR UPDATE USING (profile_id = auth.uid() OR private.is_admin());

CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (profile_id = auth.uid() OR private.is_admin());

-- Physiotherapists
CREATE POLICY "physiotherapists_select" ON physiotherapists
  FOR SELECT USING (
    profile_id = auth.uid()
    OR private.is_admin()
    OR private.get_user_role() = 'patient'
  );

CREATE POLICY "physiotherapists_update_own" ON physiotherapists
  FOR UPDATE USING (profile_id = auth.uid() OR private.is_admin());

CREATE POLICY "physiotherapists_insert" ON physiotherapists
  FOR INSERT WITH CHECK (profile_id = auth.uid() OR private.is_admin());

-- Care relationships
CREATE POLICY "care_relationships_select" ON care_relationships
  FOR SELECT USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = care_relationships.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY "care_relationships_insert" ON care_relationships
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = care_relationships.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
  );

-- Availability
CREATE POLICY "availability_select" ON availability
  FOR SELECT USING (
    private.is_admin()
    OR private.get_user_role() IN ('patient', 'physiotherapist')
  );

CREATE POLICY "availability_manage_own" ON availability
  FOR ALL USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = availability.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
  );

-- Appointments
CREATE POLICY "appointments_select" ON appointments
  FOR SELECT USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = appointments.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
  );

CREATE POLICY "appointments_insert" ON appointments
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR private.is_own_patient(patient_id)
  );

CREATE POLICY "appointments_update" ON appointments
  FOR UPDATE USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR EXISTS (
      SELECT 1 FROM physiotherapists p
      WHERE p.id = appointments.physiotherapist_id
        AND p.profile_id = auth.uid()
    )
  );

-- Clinical records
CREATE POLICY "clinical_records_select" ON clinical_records
  FOR SELECT USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR private.physio_has_patient(patient_id)
  );

CREATE POLICY "clinical_records_insert" ON clinical_records
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_patient(patient_id)
    )
  );

CREATE POLICY "clinical_records_update" ON clinical_records
  FOR UPDATE USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_patient(patient_id)
    )
  );

-- Exercise library
CREATE POLICY "exercise_library_select" ON exercise_library
  FOR SELECT USING (
    private.is_admin()
    OR private.get_user_role() IN ('patient', 'physiotherapist')
  );

CREATE POLICY "exercise_library_manage" ON exercise_library
  FOR ALL USING (
    private.is_admin()
    OR created_by = auth.uid()
  );

-- Patient exercises
CREATE POLICY "patient_exercises_select" ON patient_exercises
  FOR SELECT USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR private.physio_has_patient(patient_id)
  );

CREATE POLICY "patient_exercises_insert" ON patient_exercises
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_patient(patient_id)
    )
  );

CREATE POLICY "patient_exercises_update" ON patient_exercises
  FOR UPDATE USING (
    private.is_admin()
    OR private.is_own_patient(patient_id)
    OR private.physio_has_patient(patient_id)
  );

-- Exercise completions
CREATE POLICY "exercise_completions_select" ON exercise_completions
  FOR SELECT USING (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM patient_exercises pe
      WHERE pe.id = exercise_completions.patient_exercise_id
        AND (
          private.is_own_patient(pe.patient_id)
          OR private.physio_has_patient(pe.patient_id)
        )
    )
  );

CREATE POLICY "exercise_completions_insert" ON exercise_completions
  FOR INSERT WITH CHECK (
    private.is_admin()
    OR EXISTS (
      SELECT 1 FROM patient_exercises pe
      WHERE pe.id = exercise_completions.patient_exercise_id
        AND private.is_own_patient(pe.patient_id)
    )
  );

-- Notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR private.is_admin());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid() OR private.is_admin());

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (private.is_admin() OR user_id = auth.uid());

-- Audit logs (admin read only)
CREATE POLICY "audit_logs_admin_select" ON audit_logs
  FOR SELECT USING (private.is_admin());

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (actor_id = auth.uid() OR private.is_admin());

-- Revoke access to private schema from API roles
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
