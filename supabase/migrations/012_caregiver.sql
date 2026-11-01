-- Caregiver role and patient links

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'caregiver';

CREATE TABLE patient_caregiver_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{"view_progress":true,"view_appointments":true,"view_exercises":true,"view_clinical_records":false}'::jsonb,
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_caregiver_unique UNIQUE (patient_id, caregiver_profile_id)
);

CREATE INDEX idx_caregiver_links_patient ON patient_caregiver_links (patient_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_caregiver_links_caregiver ON patient_caregiver_links (caregiver_profile_id) WHERE revoked_at IS NULL;

-- Update handle_new_user to support caregiver (no patient/physio row)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_full_name TEXT;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient');
  IF v_role = 'admin' THEN v_role := 'patient'; END IF;
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, role, full_name) VALUES (NEW.id, v_role, v_full_name);
  IF v_role = 'patient' THEN
    INSERT INTO public.patients (profile_id) VALUES (NEW.id);
  ELSIF v_role = 'physiotherapist' THEN
    INSERT INTO public.physiotherapists (profile_id, modalities)
    VALUES (NEW.id, ARRAY['telehealth', 'home_visit']::appointment_modality[]);
  END IF;
  RETURN NEW;
END;
$$;
