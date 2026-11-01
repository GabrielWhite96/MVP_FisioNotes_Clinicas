-- Structured clinical records: assessment / evolution / reassessment

CREATE TYPE clinical_record_type AS ENUM (
  'initial_assessment',
  'evolution',
  'reassessment'
);

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS record_type clinical_record_type NOT NULL DEFAULT 'evolution',
  ADD COLUMN IF NOT EXISTS structured_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_clinical_records_patient_type_created
  ON clinical_records (patient_id, record_type, created_at DESC);

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS identity_document TEXT;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'evaluation_due';

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
      COALESCE(p_profile.full_name, 'paciente') AS patient_name
    FROM clinical_records cr
    JOIN physiotherapists ph ON ph.id = cr.physiotherapist_id
    JOIN patients p ON p.id = cr.patient_id
    JOIN profiles p_profile ON p_profile.id = p.profile_id
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

REVOKE EXECUTE ON FUNCTION public.send_evaluation_reminders() FROM PUBLIC, anon, authenticated;
