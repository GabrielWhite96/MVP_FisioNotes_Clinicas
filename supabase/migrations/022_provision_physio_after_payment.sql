-- Professional accounts are created only after a paid Stripe subscription.

ALTER TABLE public.physiotherapists
  ADD COLUMN IF NOT EXISTS credentials_email_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.service_find_auth_user_id(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT id
    FROM auth.users
    WHERE lower(email) = lower(trim(p_email))
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.service_find_auth_user_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.service_find_auth_user_id(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_find_auth_user_id(text) TO service_role;

CREATE OR REPLACE FUNCTION public.protect_physiotherapist_billing_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' OR private.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.subscription_status := OLD.subscription_status;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.stripe_customer_id := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.credentials_email_sent_at := OLD.credentials_email_sent_at;
  RETURN NEW;
END;
$$;

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
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  v_invite_token := NEW.raw_user_meta_data->>'invite_token';
  v_meta_role := NEW.raw_user_meta_data->>'role';
  v_provisioned_by := COALESCE(NEW.raw_app_meta_data->>'provisioned_by', '');

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

  IF v_provisioned_by IS DISTINCT FROM 'stripe_saas' THEN
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

  RETURN NEW;
END;
$$;
