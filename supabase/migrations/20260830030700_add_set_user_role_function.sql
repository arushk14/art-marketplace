-- ============================================================
-- SECURITY DEFINER function to set user role
-- ============================================================
-- Since profiles.role is no longer client-updatable, this function
-- allows setting the role during artist profile creation. Only the
-- user themselves can change their own role.

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only set your own role';
  END IF;
  IF new_role NOT IN ('buyer', 'artist') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  UPDATE public.profiles SET role = new_role WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
