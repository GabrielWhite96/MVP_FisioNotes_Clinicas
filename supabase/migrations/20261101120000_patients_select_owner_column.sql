-- INSERT ... RETURNING applies SELECT policies to the new row.
-- private.physio_has_patient() is STABLE and cannot see the row inserted
-- in the same statement, so creating a clinic patient (profile_id IS NULL)
-- failed with: new row violates row-level security policy for table "patients".
-- Checking physiotherapist_id on the new row itself does not re-query patients.

DROP POLICY IF EXISTS "patients_select" ON public.patients;

CREATE POLICY "patients_select"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR private.is_admin()
    OR physiotherapist_id = private.get_physiotherapist_id_for_user()
    OR private.physio_has_patient(id)
    OR private.caregiver_has_patient(id)
  );
