-- Scheduling enhancements

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_blocks_time_check CHECK (start_at < end_at)
);

CREATE INDEX idx_availability_blocks_physio ON availability_blocks (physiotherapist_id, start_at);

-- Appointment reminder function (call via pg_cron or Edge Function)
CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT a.id, a.scheduled_at, p.profile_id AS patient_profile, ph.profile_id AS physio_profile
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN physiotherapists ph ON ph.id = a.physiotherapist_id
    WHERE a.status IN ('scheduled', 'confirmed')
      AND a.scheduled_at BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.metadata->>'appointment_id' = a.id::text
          AND n.type = 'appointment_reminder'
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (r.patient_profile, 'appointment_reminder', 'Lembrete de consulta',
      'Sua consulta é amanhã.', jsonb_build_object('appointment_id', r.id));
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (r.physio_profile, 'appointment_reminder', 'Lembrete de consulta',
      'Consulta amanhã com paciente.', jsonb_build_object('appointment_id', r.id));
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_appointment_reminders() FROM PUBLIC, anon, authenticated;
