-- Clinic staff (no login) and historical patient–therapist assignments.
-- Additive: does not alter physiotherapists ownership or care_relationships.

ALTER TYPE clinical_record_type ADD VALUE IF NOT EXISTS 'anamnese';
ALTER TYPE clinical_record_type ADD VALUE IF NOT EXISTS 'discharge';

CREATE TABLE public.clinic_physiotherapists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES public.physiotherapists(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX clinic_physiotherapists_practice_id_idx
  ON public.clinic_physiotherapists (practice_id);

CREATE INDEX clinic_physiotherapists_practice_active_idx
  ON public.clinic_physiotherapists (practice_id)
  WHERE is_active = true;

CREATE TABLE public.patient_therapist_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_physiotherapist_id UUID NOT NULL REFERENCES public.clinic_physiotherapists(id) ON DELETE RESTRICT,
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT patient_therapist_assignments_period_check
    CHECK (ended_on IS NULL OR ended_on >= started_on)
);

CREATE UNIQUE INDEX patient_therapist_assignments_one_active_idx
  ON public.patient_therapist_assignments (patient_id)
  WHERE ended_on IS NULL;

CREATE INDEX patient_therapist_assignments_patient_id_idx
  ON public.patient_therapist_assignments (patient_id, started_on);

CREATE INDEX patient_therapist_assignments_staff_id_idx
  ON public.patient_therapist_assignments (clinic_physiotherapist_id, started_on);

CREATE INDEX patient_therapist_assignments_period_idx
  ON public.patient_therapist_assignments (started_on, ended_on);

ALTER TABLE public.clinical_records
  ADD COLUMN IF NOT EXISTS performed_by_id UUID REFERENCES public.clinic_physiotherapists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS clinical_records_performed_by_id_idx
  ON public.clinical_records (performed_by_id);

CREATE TRIGGER set_updated_at_clinic_physiotherapists
  BEFORE UPDATE ON public.clinic_physiotherapists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_patient_therapist_assignments
  BEFORE UPDATE ON public.patient_therapist_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_patient_therapist(
  p_patient_id UUID,
  p_clinic_physiotherapist_id UUID,
  p_started_on DATE DEFAULT CURRENT_DATE
)
RETURNS public.patient_therapist_assignments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_practice_id UUID;
  v_staff_practice UUID;
  v_staff_active BOOLEAN;
  v_current public.patient_therapist_assignments%ROWTYPE;
  v_row public.patient_therapist_assignments%ROWTYPE;
BEGIN
  v_practice_id := private.get_physiotherapist_id_for_user();

  IF v_practice_id IS NULL AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT s.practice_id, s.is_active
    INTO v_staff_practice, v_staff_active
  FROM public.clinic_physiotherapists s
  WHERE s.id = p_clinic_physiotherapist_id;

  IF v_staff_practice IS NULL THEN
    RAISE EXCEPTION 'Fisioterapeuta não encontrado';
  END IF;

  IF NOT private.is_admin() AND v_staff_practice IS DISTINCT FROM v_practice_id THEN
    RAISE EXCEPTION 'Fisioterapeuta não pertence a esta clínica';
  END IF;

  IF NOT COALESCE(v_staff_active, false) THEN
    RAISE EXCEPTION 'Fisioterapeuta inativo';
  END IF;

  IF NOT private.is_admin() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = p_patient_id
        AND p.physiotherapist_id = v_practice_id
    ) THEN
      RAISE EXCEPTION 'Paciente não encontrado nesta clínica';
    END IF;
  END IF;

  SELECT *
    INTO v_current
  FROM public.patient_therapist_assignments
  WHERE patient_id = p_patient_id
    AND ended_on IS NULL
  FOR UPDATE;

  IF FOUND THEN
    IF v_current.clinic_physiotherapist_id = p_clinic_physiotherapist_id THEN
      RETURN v_current;
    END IF;

    IF p_started_on < v_current.started_on THEN
      RAISE EXCEPTION 'A data de início não pode ser anterior ao vínculo atual';
    END IF;

    UPDATE public.patient_therapist_assignments
    SET ended_on = p_started_on
    WHERE id = v_current.id;
  END IF;

  INSERT INTO public.patient_therapist_assignments (
    patient_id,
    clinic_physiotherapist_id,
    started_on
  )
  VALUES (
    p_patient_id,
    p_clinic_physiotherapist_id,
    p_started_on
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_patient_therapist(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_patient_therapist(UUID, UUID, DATE) TO authenticated;

ALTER TABLE public.clinic_physiotherapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_therapist_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clinic_physiotherapists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patient_therapist_assignments TO authenticated;

CREATE POLICY clinic_physiotherapists_select ON public.clinic_physiotherapists
  FOR SELECT
  TO authenticated
  USING (
    private.is_admin()
    OR practice_id = private.get_physiotherapist_id_for_user()
  );

CREATE POLICY clinic_physiotherapists_insert ON public.clinic_physiotherapists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND practice_id = private.get_physiotherapist_id_for_user()
    )
  );

CREATE POLICY clinic_physiotherapists_update ON public.clinic_physiotherapists
  FOR UPDATE
  TO authenticated
  USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND practice_id = private.get_physiotherapist_id_for_user()
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND practice_id = private.get_physiotherapist_id_for_user()
    )
  );

CREATE POLICY clinic_physiotherapists_delete ON public.clinic_physiotherapists
  FOR DELETE
  TO authenticated
  USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND practice_id = private.get_physiotherapist_id_for_user()
    )
  );

CREATE POLICY patient_therapist_assignments_select ON public.patient_therapist_assignments
  FOR SELECT
  TO authenticated
  USING (
    private.is_admin()
    OR private.physio_has_patient(patient_id)
  );

CREATE POLICY patient_therapist_assignments_insert ON public.patient_therapist_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND EXISTS (
        SELECT 1
        FROM public.clinic_physiotherapists s
        WHERE s.id = clinic_physiotherapist_id
          AND s.practice_id = private.get_physiotherapist_id_for_user()
      )
    )
  );

CREATE POLICY patient_therapist_assignments_update ON public.patient_therapist_assignments
  FOR UPDATE
  TO authenticated
  USING (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
    )
  )
  WITH CHECK (
    private.is_admin()
    OR (
      private.get_user_role() = 'physiotherapist'
      AND private.physio_has_active_subscription()
      AND private.physio_has_patient(patient_id)
      AND EXISTS (
        SELECT 1
        FROM public.clinic_physiotherapists s
        WHERE s.id = clinic_physiotherapist_id
          AND s.practice_id = private.get_physiotherapist_id_for_user()
      )
    )
  );
