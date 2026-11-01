-- Core tables

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_birth DATE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE physiotherapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  license_number TEXT,
  province TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  experience_years INTEGER,
  modalities appointment_modality[] NOT NULL DEFAULT '{}',
  service_cities TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE care_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT care_relationships_active_unique UNIQUE (patient_id, physiotherapist_id)
);

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  modality appointment_modality NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_time_check CHECK (start_time < end_time)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  modality appointment_modality NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  home_address TEXT,
  notes TEXT,
  price_cents INTEGER,
  insurance_id UUID,
  recurrence_rule TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_physio_scheduled ON appointments (physiotherapist_id, scheduled_at);
CREATE INDEX idx_appointments_patient_status ON appointments (patient_id, status);
CREATE INDEX idx_appointments_status_scheduled ON appointments (status, scheduled_at);
CREATE INDEX idx_patients_profile ON patients (profile_id);
CREATE INDEX idx_physiotherapists_profile ON physiotherapists (profile_id);
CREATE INDEX idx_care_relationships_patient ON care_relationships (patient_id);
CREATE INDEX idx_care_relationships_physio ON care_relationships (physiotherapist_id);
CREATE INDEX idx_availability_physio ON availability (physiotherapist_id, day_of_week);

CREATE UNIQUE INDEX idx_appointments_no_double_booking
  ON appointments (physiotherapist_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show');
