-- Auth admin createUser does not always persist app_metadata before handle_new_user.
-- Allow paid Stripe provisioning via a short-lived token written by the service role.

CREATE TABLE IF NOT EXISTS private.stripe_physio_provision (
  email text PRIMARY KEY,
  token uuid NOT NULL,
  full_name text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.stripe_physio_provision FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role, supabase_auth_admin, supabase_admin;
GRANT ALL ON TABLE private.stripe_physio_provision TO postgres, service_role, supabase_auth_admin, supabase_admin;

CREATE OR REPLACE FUNCTION public.service_allow_stripe_physio(p_email text, p_full_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_email text;
  v_token uuid;
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email NOT LIKE '%_@_%' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  v_token := gen_random_uuid();

  INSERT INTO private.stripe_physio_provision (email, token, full_name, expires_at)
  VALUES (v_email, v_token, nullif(trim(p_full_name), ''), now() + interval '30 minutes')
  ON CONFLICT (email) DO UPDATE
    SET token = excluded.token,
        full_name = excluded.full_name,
        expires_at = excluded.expires_at,
        created_at = now();

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.service_allow_stripe_physio(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.service_allow_stripe_physio(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_allow_stripe_physio(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_full_name TEXT;
  v_invite_token TEXT;
  v_invite patient_invites%ROWTYPE;
  v_meta_role TEXT;
  v_provisioned_by TEXT;
  v_provision_token TEXT;
  v_email_allowed BOOLEAN := FALSE;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';
  v_meta_role := NEW.raw_user_meta_data->>'role';
  v_provisioned_by := COALESCE(NEW.raw_app_meta_data->>'provisioned_by', '');
  v_provision_token := COALESCE(NEW.raw_user_meta_data->>'provision_token', '');

  IF v_invite_token IS NOT NULL AND length(v_invite_token) > 0 THEN
    SELECT * INTO v_invite
    FROM patient_invites
    WHERE invite_token = v_invite_token
      AND status = 'pending'
      AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or expired patient invite';
    END IF;

    IF lower(v_invite.email) <> lower(NEW.email) THEN
      RAISE EXCEPTION 'Invite email does not match signup email';
    END IF;

    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (
      NEW.id,
      'patient',
      COALESCE(v_full_name, (SELECT full_name FROM patients WHERE id = v_invite.patient_id)),
      NULL
    );

    UPDATE public.patients
    SET
      profile_id = NEW.id,
      account_status = 'active',
      full_name = COALESCE(patients.full_name, v_full_name),
      email = COALESCE(patients.email, NEW.email),
      updated_at = now()
    WHERE id = v_invite.patient_id;

    UPDATE public.patient_invites
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_profile_id = NEW.id,
      updated_at = now()
    WHERE id = v_invite.id;

    INSERT INTO public.care_relationships (patient_id, physiotherapist_id)
    VALUES (v_invite.patient_id, v_invite.physiotherapist_id)
    ON CONFLICT (patient_id, physiotherapist_id) DO UPDATE
      SET ended_at = NULL, updated_at = now();

    RETURN NEW;
  END IF;

  IF v_meta_role = 'caregiver' THEN
    IF EXISTS (
      SELECT 1 FROM caregiver_invites ci
      WHERE lower(ci.email) = lower(NEW.email)
        AND ci.status = 'pending'
        AND ci.expires_at > now()
    ) THEN
      INSERT INTO public.profiles (id, role, full_name)
      VALUES (NEW.id, 'caregiver', v_full_name);
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Caregiver signup requires a valid invite';
  END IF;

  IF v_provision_token <> '' THEN
    SELECT TRUE
      INTO v_email_allowed
    FROM private.stripe_physio_provision a
    WHERE a.email = lower(NEW.email)
      AND a.token::text = v_provision_token
      AND a.expires_at > now();
  END IF;

  IF v_provisioned_by IS DISTINCT FROM 'stripe_saas' AND NOT COALESCE(v_email_allowed, FALSE) THEN
    RAISE EXCEPTION 'Professional accounts are created after subscription payment';
  END IF;

  v_role := 'physiotherapist';

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, v_role, v_full_name);

  INSERT INTO public.physiotherapists (
    profile_id,
    modalities,
    subscription_status,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    ARRAY['telehealth', 'home_visit']::appointment_modality[],
    'inactive',
    NULL
  );

  DELETE FROM private.stripe_physio_provision
  WHERE email = lower(NEW.email);

  RETURN NEW;
END;
$$;
