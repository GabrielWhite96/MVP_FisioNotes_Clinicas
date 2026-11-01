-- Extensions and enums
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM (
  'patient',
  'physiotherapist',
  'admin'
);

CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE appointment_modality AS ENUM (
  'telehealth',
  'home_visit'
);

CREATE TYPE notification_type AS ENUM (
  'appointment_reminder',
  'appointment_confirmed',
  'appointment_cancelled',
  'exercise_assigned',
  'general'
);

CREATE TYPE audit_action AS ENUM (
  'LOGIN',
  'PATIENT_CREATED',
  'PHYSIOTHERAPIST_CREATED',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_COMPLETED',
  'CLINICAL_RECORD_CREATED',
  'CLINICAL_RECORD_UPDATED',
  'EXERCISE_ASSIGNED',
  'EXERCISE_COMPLETED'
);
