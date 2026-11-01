-- Lookup a profile by auth email so patients can authorize caregivers.

CREATE OR REPLACE FUNCTION public.lookup_profile_by_email(p_email TEXT)
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(trim(p_email))
    AND p.role = 'caregiver'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_profile_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_email(TEXT) TO authenticated;
