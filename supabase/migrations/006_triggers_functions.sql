-- Triggers and functions

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_patients
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_physiotherapists
  BEFORE UPDATE ON physiotherapists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_care_relationships
  BEFORE UPDATE ON care_relationships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_availability
  BEFORE UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_clinical_records
  BEFORE UPDATE ON clinical_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_exercise_library
  BEFORE UPDATE ON exercise_library FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_patient_exercises
  BEFORE UPDATE ON patient_exercises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Handle new user signup
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
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'patient'
  );

  IF v_role = 'admin' THEN
    v_role := 'patient';
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, v_role, v_full_name);

  IF v_role = 'patient' THEN
    INSERT INTO public.patients (profile_id)
    VALUES (NEW.id);
  ELSIF v_role = 'physiotherapist' THEN
    INSERT INTO public.physiotherapists (profile_id, modalities)
    VALUES (NEW.id, ARRAY['telehealth', 'home_visit']::appointment_modality[]);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create care relationship on appointment
CREATE OR REPLACE FUNCTION public.create_care_relationship_on_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.care_relationships (patient_id, physiotherapist_id)
  VALUES (NEW.patient_id, NEW.physiotherapist_id)
  ON CONFLICT (patient_id, physiotherapist_id) DO UPDATE
    SET ended_at = NULL, updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_created
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.create_care_relationship_on_appointment();

-- Audit log helper
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action audit_action,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- Notification on appointment created
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

  INSERT INTO notifications (user_id, type, title, body, metadata)
  VALUES (
    v_patient_profile,
    'appointment_confirmed',
    'Consulta agendada',
    'Sua consulta foi agendada com sucesso.',
    jsonb_build_object('appointment_id', NEW.id)
  );

  INSERT INTO notifications (user_id, type, title, body, metadata)
  VALUES (
    v_physio_profile,
    'appointment_confirmed',
    'Nova consulta',
    'Um paciente agendou uma nova consulta.',
    jsonb_build_object('appointment_id', NEW.id)
  );

  PERFORM public.log_audit_event(
    'APPOINTMENT_CREATED',
    'appointments',
    NEW.id,
    jsonb_build_object('modality', NEW.modality, 'scheduled_at', NEW.scheduled_at)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_created_notify
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_created();
