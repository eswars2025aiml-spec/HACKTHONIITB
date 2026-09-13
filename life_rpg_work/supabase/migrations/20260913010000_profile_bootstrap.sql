/*
  Life RPG — Profile bootstrap / repair

  Fixes users who already have an auth.users row but are missing their
  corresponding public.profiles row (for example, users created before the
  profile trigger existed or after a partial migration).
*/

CREATE OR REPLACE FUNCTION ensure_my_profile()
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_profile
  FROM profiles
  WHERE id = auth.uid();

  IF FOUND THEN
    RETURN v_profile;
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  INSERT INTO profiles (id, username)
  VALUES (
    auth.uid(),
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Set a useful username if the JWT metadata path above was not available.
  UPDATE profiles
  SET username = COALESCE(NULLIF(username, ''), split_part(COALESCE(v_email, 'hero'), '@', 1))
  WHERE id = auth.uid();

  SELECT * INTO v_profile
  FROM profiles
  WHERE id = auth.uid();

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_my_profile() TO authenticated;

-- Backfill profiles for all existing auth users.
INSERT INTO profiles (id, username)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'username', ''), split_part(COALESCE(u.email, 'hero'), '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
