-- Clinical profiles and consent management

CREATE TYPE consent_type AS ENUM (
  'telehealth', 'privacy', 'caregiver_access', 'data_processing', 'terms'
);

CREATE TABLE patient_clinical_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  condition TEXT,
  diagnosis TEXT,
  medical_history TEXT,
  medications TEXT,
  allergies TEXT,
  restrictions TEXT,
  referring_physician TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type consent_type NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consents_patient ON consents (patient_id, type);

CREATE TRIGGER set_updated_at_patient_clinical_profiles
  BEFORE UPDATE ON patient_clinical_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
