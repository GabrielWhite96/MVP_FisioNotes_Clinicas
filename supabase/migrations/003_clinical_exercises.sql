-- Clinical and exercise tables

CREATE TABLE clinical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assessment TEXT,
  observations TEXT,
  evolution TEXT,
  treatment_plan TEXT,
  recommendations TEXT,
  next_evaluation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  video_url TEXT,
  difficulty TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE patient_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  frequency TEXT NOT NULL DEFAULT 'daily',
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exercise_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_exercise_id UUID NOT NULL REFERENCES patient_exercises(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clinical_records_patient ON clinical_records (patient_id);
CREATE INDEX idx_clinical_records_physio ON clinical_records (physiotherapist_id);
CREATE INDEX idx_clinical_records_appointment ON clinical_records (appointment_id);
CREATE INDEX idx_patient_exercises_patient ON patient_exercises (patient_id, active);
CREATE INDEX idx_patient_exercises_physio ON patient_exercises (physiotherapist_id);
CREATE INDEX idx_exercise_completions_patient_exercise ON exercise_completions (patient_exercise_id);
