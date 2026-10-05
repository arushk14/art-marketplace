-- Revoke EXECUTE from PUBLIC (covers anon + authenticated) for both SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon, authenticated;

-- Only grant EXECUTE on set_user_role to authenticated (needed for artist profile creation)
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;

-- Verify
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'), 'anon can still exec handle_new_user';
  ASSERT NOT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'), 'authenticated can still exec handle_new_user';
  ASSERT NOT has_function_privilege('anon', 'public.set_user_role(uuid, text)', 'EXECUTE'), 'anon can still exec set_user_role';
  ASSERT has_function_privilege('authenticated', 'public.set_user_role(uuid, text)', 'EXECUTE'), 'authenticated cannot exec set_user_role';
END $$;
