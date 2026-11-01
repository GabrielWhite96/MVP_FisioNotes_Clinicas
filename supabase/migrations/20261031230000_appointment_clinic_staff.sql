-- Each appointment links a patient to a clinic physiotherapist.
-- Two staff members may work at the same clock time; one staff member may not.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS clinic_physiotherapist_id UUID REFERENCES clinic_physiotherapists(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_staff_scheduled
  ON appointments (clinic_physiotherapist_id, scheduled_at)
  WHERE clinic_physiotherapist_id IS NOT NULL;

DROP INDEX IF EXISTS idx_appointments_no_double_booking;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_staff_no_double_booking
  ON appointments (clinic_physiotherapist_id, scheduled_at)
  WHERE status NOT IN ('cancelled', 'no_show') AND clinic_physiotherapist_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_clinic_staff_appointment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clinic_physiotherapist_id IS NULL THEN
    RAISE EXCEPTION 'Informe o fisioterapeuta do atendimento';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM clinic_physiotherapists cp
    WHERE cp.id = NEW.clinic_physiotherapist_id
      AND cp.practice_id = NEW.physiotherapist_id
  ) THEN
    RAISE EXCEPTION 'Fisioterapeuta não pertence a esta clínica';
  END IF;

  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.clinic_physiotherapist_id = NEW.clinic_physiotherapist_id
      AND a.id IS DISTINCT FROM NEW.id
      AND a.status NOT IN ('cancelled', 'no_show')
      AND tstzrange(a.scheduled_at, a.scheduled_at + make_interval(mins => a.duration_minutes), '[)')
          && tstzrange(NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => NEW.duration_minutes), '[)')
  ) THEN
    RAISE EXCEPTION 'Horário já ocupado para este fisioterapeuta';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_clinic_staff_appointment_overlap ON appointments;
CREATE TRIGGER trg_prevent_clinic_staff_appointment_overlap
  BEFORE INSERT OR UPDATE OF clinic_physiotherapist_id, scheduled_at, duration_minutes, status, physiotherapist_id
  ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_clinic_staff_appointment_overlap();

-- Clinic patients often have no login; skip notifications when profile_id is missing.
CREATE OR REPLACE FUNCTION public.notify_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_profile UUID;
  v_physio_profile UUID;
BEGIN
  SELECT profile_id INTO v_patient_profile FROM patients WHERE id = NEW.patient_id;
  SELECT profile_id INTO v_physio_profile FROM physiotherapists WHERE id = NEW.physiotherapist_id;

  IF v_patient_profile IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      v_patient_profile,
      'appointment_confirmed',
      'Consulta agendada',
      'Sua consulta foi agendada com sucesso.',
      jsonb_build_object('appointment_id', NEW.id)
    );
  END IF;

  IF v_physio_profile IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      v_physio_profile,
      'appointment_confirmed',
      'Nova consulta',
      'Um paciente agendou uma nova consulta.',
      jsonb_build_object('appointment_id', NEW.id)
    );
  END IF;

  PERFORM public.log_audit_event(
    'APPOINTMENT_CREATED',
    'appointments',
    NEW.id,
    jsonb_build_object('modality', NEW.modality, 'scheduled_at', NEW.scheduled_at)
  );

  RETURN NEW;
END;
$$;
