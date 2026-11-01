-- RLS for V1.1 tables

ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_clinical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_caregiver_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Treatment plans
CREATE POLICY "treatment_plans_select" ON treatment_plans FOR SELECT USING (
  private.is_admin() OR private.is_own_patient(patient_id) OR private.physio_has_patient(patient_id)
);
CREATE POLICY "treatment_plans_insert" ON treatment_plans FOR INSERT WITH CHECK (
  private.is_admin() OR (private.get_user_role() = 'physiotherapist' AND private.physio_has_patient(patient_id))
);
CREATE POLICY "treatment_plans_update" ON treatment_plans FOR UPDATE USING (
  private.is_admin() OR (private.get_user_role() = 'physiotherapist' AND private.physio_has_patient(patient_id))
);

-- Treatment goals
CREATE POLICY "treatment_goals_select" ON treatment_goals FOR SELECT USING (
  private.is_admin() OR EXISTS (
    SELECT 1 FROM treatment_plans tp WHERE tp.id = treatment_goals.treatment_plan_id
      AND (private.is_own_patient(tp.patient_id) OR private.physio_has_patient(tp.patient_id))
  )
);
CREATE POLICY "treatment_goals_manage" ON treatment_goals FOR ALL USING (
  private.is_admin() OR EXISTS (
    SELECT 1 FROM treatment_plans tp WHERE tp.id = treatment_goals.treatment_plan_id
      AND private.physio_has_patient(tp.patient_id)
  )
);

-- Check-ins
CREATE POLICY "check_ins_select" ON check_ins FOR SELECT USING (
  private.is_admin() OR private.is_own_patient(patient_id) OR private.physio_has_patient(patient_id)
);
CREATE POLICY "check_ins_insert" ON check_ins FOR INSERT WITH CHECK (
  private.is_admin() OR private.is_own_patient(patient_id)
);

-- Availability blocks
CREATE POLICY "availability_blocks_select" ON availability_blocks FOR SELECT USING (
  private.is_admin() OR private.get_user_role() IN ('patient', 'physiotherapist')
);
CREATE POLICY "availability_blocks_manage" ON availability_blocks FOR ALL USING (
  private.is_admin() OR EXISTS (
    SELECT 1 FROM physiotherapists p WHERE p.id = availability_blocks.physiotherapist_id AND p.profile_id = auth.uid()
  )
);

-- Clinical profiles
CREATE POLICY "clinical_profiles_select" ON patient_clinical_profiles FOR SELECT USING (
  private.is_admin() OR private.is_own_patient(patient_id) OR private.physio_has_patient(patient_id)
);
CREATE POLICY "clinical_profiles_manage" ON patient_clinical_profiles FOR ALL USING (
  private.is_admin() OR private.is_own_patient(patient_id)
  OR (private.get_user_role() = 'physiotherapist' AND private.physio_has_patient(patient_id))
);

-- Consents
CREATE POLICY "consents_select" ON consents FOR SELECT USING (
  private.is_admin() OR private.is_own_patient(patient_id) OR private.physio_has_patient(patient_id)
);
CREATE POLICY "consents_insert" ON consents FOR INSERT WITH CHECK (
  private.is_admin() OR private.is_own_patient(patient_id)
);

-- Caregiver links
CREATE OR REPLACE FUNCTION private.caregiver_has_patient(p_patient_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_caregiver_links pcl
    WHERE pcl.patient_id = p_patient_id AND pcl.caregiver_profile_id = auth.uid() AND pcl.revoked_at IS NULL
  );
$$;

CREATE POLICY "caregiver_links_select" ON patient_caregiver_links FOR SELECT USING (
  private.is_admin()
  OR private.is_own_patient(patient_id)
  OR caregiver_profile_id = auth.uid()
);
CREATE POLICY "caregiver_links_insert" ON patient_caregiver_links FOR INSERT WITH CHECK (
  private.is_admin() OR private.is_own_patient(patient_id)
);
CREATE POLICY "caregiver_links_update" ON patient_caregiver_links FOR UPDATE USING (
  private.is_admin() OR private.is_own_patient(patient_id)
);

GRANT EXECUTE ON FUNCTION private.caregiver_has_patient TO authenticated;

-- Caregiver read access (no clinical records)
CREATE POLICY "treatment_plans_caregiver_select" ON treatment_plans FOR SELECT USING (
  private.caregiver_has_patient(patient_id)
);
CREATE POLICY "check_ins_caregiver_select" ON check_ins FOR SELECT USING (
  private.caregiver_has_patient(patient_id)
);
CREATE POLICY "appointments_caregiver_select" ON appointments FOR SELECT USING (
  private.caregiver_has_patient(patient_id)
);
CREATE POLICY "patient_exercises_caregiver_select" ON patient_exercises FOR SELECT USING (
  private.caregiver_has_patient(patient_id)
);
CREATE POLICY "patients_caregiver_select" ON patients FOR SELECT USING (
  private.caregiver_has_patient(id)
);

-- Payments
CREATE POLICY "payments_select" ON payments FOR SELECT USING (
  private.is_admin() OR private.is_own_patient(patient_id)
);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (
  private.is_admin() OR private.is_own_patient(patient_id)
);
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (private.is_admin());
