/*
# Life RPG — Core Schema

## Overview
Creates the full database for a gamified task tracker ("Life RPG"). Users sign up
with email/password. Each user gets a profile with RPG stats (level, XP, gold,
four attributes, streak). Users create quests (tasks) with category, difficulty,
XP/gold rewards, due date, and a target attribute. Completing a quest awards
XP, gold, and attribute points through a SECURITY DEFINER function — the client
cannot directly modify stats, preventing cheating.

## Tables

1. **profiles** — one row per auth.users user, stores RPG stats
   - id (uuid, PK, FK → auth.users)
   - username (text)
   - level, xp, gold (int, default 1/0/0)
   - strength, intellect, vitality, creativity (int, default 0)
   - current_streak (int, default 0)
   - last_completion_date (date, nullable)
   - created_at (timestamptz)

2. **quests** — user-created tasks
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users, DEFAULT auth.uid())
   - title (text, required)
   - description (text)
   - category (text: study|coding|exercise|reading|personal|other)
   - difficulty (text: easy|medium|hard|epic)
   - xp_reward, gold_reward (int)
   - attribute (text: strength|intellect|vitality|creativity)
   - due_date (date, nullable)
   - completed (bool, default false)
   - completed_at (timestamptz, nullable)
   - created_at (timestamptz)

3. **task_completions** — audit log of quest completions
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users, DEFAULT auth.uid())
   - quest_id (uuid, FK → quests, nullable ON DELETE SET NULL)
   - xp_awarded, gold_awarded (int)
   - attribute_awarded (text), attribute_amount (int)
   - completed_at (timestamptz)

## Security

- RLS enabled on profiles, quests, task_completions.
- profiles: SELECT own row; UPDATE own row BUT a trigger blocks direct changes
  to xp/gold/level/attributes/streak — those only change via the
  complete_quest() SECURITY DEFINER function. Users can freely change username.
- quests: full owner-scoped CRUD (select/insert/update/delete).
- task_completions: SELECT own rows, INSERT via function only (no direct
  INSERT/UPDATE/DELETE policy — only the definer can write).
- complete_quest(uuid) is SECURITY DEFINER, verifies ownership + not-already-
  -completed, marks quest done, inserts completion log, updates profile stats
  atomically. Granted EXECUTE to authenticated.
- A trigger on auth.users auto-creates a profile row on signup.

## Notes

1. Level formula: floor(sqrt(xp / 100)) + 1
   - Level 2 at 100 XP, Level 3 at 400, Level 4 at 900, etc.
2. Streak logic: +1 if last completion was yesterday; reset to 1 if gap > 1 day;
   unchanged if already completed today.
3. The protect_profile_stats trigger uses a session variable
   (app.bypass_protection) that the complete_quest function sets, so the
   function can update stats while direct client UPDATEs cannot.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL DEFAULT '',
  level int NOT NULL DEFAULT 1,
  xp int NOT NULL DEFAULT 0,
  gold int NOT NULL DEFAULT 0,
  strength int NOT NULL DEFAULT 0,
  intellect int NOT NULL DEFAULT 0,
  vitality int NOT NULL DEFAULT 0,
  creativity int NOT NULL DEFAULT 0,
  current_streak int NOT NULL DEFAULT 0,
  last_completion_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ QUESTS ============
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('study','coding','exercise','reading','personal','other')),
  difficulty text NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard','epic')),
  xp_reward int NOT NULL DEFAULT 10 CHECK (xp_reward >= 0 AND xp_reward <= 1000),
  gold_reward int NOT NULL DEFAULT 5 CHECK (gold_reward >= 0 AND gold_reward <= 1000),
  attribute text NOT NULL DEFAULT 'strength' CHECK (attribute IN ('strength','intellect','vitality','creativity')),
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quests" ON quests;
CREATE POLICY "select_own_quests" ON quests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_quests" ON quests;
CREATE POLICY "insert_own_quests" ON quests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_quests" ON quests;
CREATE POLICY "update_own_quests" ON quests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_quests" ON quests;
CREATE POLICY "delete_own_quests" ON quests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_quests_user_id ON quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quests_user_completed ON quests(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_quests_user_due_date ON quests(user_id, due_date);

-- ============ TASK_COMPLETIONS ============
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES quests(id) ON DELETE SET NULL,
  xp_awarded int NOT NULL DEFAULT 0,
  gold_awarded int NOT NULL DEFAULT 0,
  attribute_awarded text NOT NULL DEFAULT 'strength',
  attribute_amount int NOT NULL DEFAULT 1,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_completions" ON task_completions;
CREATE POLICY "select_own_completions" ON task_completions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: only the complete_quest() SECURITY DEFINER
-- function can write to this table.

CREATE INDEX IF NOT EXISTS idx_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_quest_id ON task_completions(quest_id);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ PROTECT PROFILE STATS ============
-- Trigger that blocks direct client updates to sensitive stat columns.
-- The complete_quest function sets a session variable to bypass this.
CREATE OR REPLACE FUNCTION protect_profile_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow bypass from SECURITY DEFINER functions
  IF current_setting('app.bypass_protection', true) = '1' THEN
    RETURN NEW;
  END IF;

  -- Block direct changes to any stat column
  IF NEW.xp != OLD.xp
     OR NEW.gold != OLD.gold
     OR NEW.level != OLD.level
     OR NEW.strength != OLD.strength
     OR NEW.intellect != OLD.intellect
     OR NEW.vitality != OLD.vitality
     OR NEW.creativity != OLD.creativity
     OR NEW.current_streak != OLD.current_streak
     OR NEW.last_completion_date IS DISTINCT FROM OLD.last_completion_date THEN
    RAISE EXCEPTION 'Cannot directly modify profile stats. Use complete_quest().';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_stats ON profiles;
CREATE TRIGGER trg_protect_profile_stats
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_stats();

-- ============ COMPLETE QUEST FUNCTION ============
-- SECURITY DEFINER: verifies ownership, prevents duplicate completion,
-- marks quest done, logs completion, awards XP/gold/attribute/streak atomically.
CREATE OR REPLACE FUNCTION complete_quest(quest_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quest     RECORD;
  v_profile   RECORD;
  v_new_xp    int;
  v_new_level int;
  v_streak    int;
  v_today     date := CURRENT_DATE;
  v_last_date date;
BEGIN
  -- Verify ownership and not already completed
  SELECT * INTO v_quest FROM quests WHERE id = quest_uuid AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found or not owned by you';
  END IF;
  IF v_quest.completed THEN
    RAISE EXCEPTION 'Quest already completed';
  END IF;

  -- Get current profile
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Mark quest completed
  UPDATE quests
    SET completed = true, completed_at = now()
    WHERE id = quest_uuid;

  -- Compute streak
  v_last_date := v_profile.last_completion_date;
  IF v_last_date IS NULL THEN
    v_streak := 1;
  ELSIF v_last_date = v_today THEN
    v_streak := v_profile.current_streak;
  ELSIF v_last_date = v_today - 1 THEN
    v_streak := v_profile.current_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  -- Compute new XP and level
  v_new_xp := v_profile.xp + v_quest.xp_reward;
  v_new_level := FLOOR(SQRT(CAST(v_new_xp AS float) / 100.0)) + 1;

  -- Bypass the stat protection trigger, then update profile
  PERFORM set_config('app.bypass_protection', '1', true);

  UPDATE profiles SET
    xp = v_new_xp,
    gold = gold + v_quest.gold_reward,
    level = GREATEST(v_profile.level, v_new_level),
    current_streak = v_streak,
    last_completion_date = v_today,
    strength = strength + CASE WHEN v_quest.attribute = 'strength' THEN 1 ELSE 0 END,
    intellect = intellect + CASE WHEN v_quest.attribute = 'intellect' THEN 1 ELSE 0 END,
    vitality = vitality + CASE WHEN v_quest.attribute = 'vitality' THEN 1 ELSE 0 END,
    creativity = creativity + CASE WHEN v_quest.attribute = 'creativity' THEN 1 ELSE 0 END
  WHERE id = auth.uid();

  -- Insert completion log (bypasses RLS because SECURITY DEFINER)
  INSERT INTO task_completions (user_id, quest_id, xp_awarded, gold_awarded, attribute_awarded, attribute_amount)
  VALUES (auth.uid(), quest_uuid, v_quest.xp_reward, v_quest.gold_reward, v_quest.attribute, 1);

  -- Return updated stats for the client
  RETURN jsonb_build_object(
    'xp', v_new_xp,
    'gold', v_profile.gold + v_quest.gold_reward,
    'level', GREATEST(v_profile.level, v_new_level),
    'streak', v_streak,
    'xp_awarded', v_quest.xp_reward,
    'gold_awarded', v_quest.gold_reward,
    'attribute_awarded', v_quest.attribute
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_quest(uuid) TO authenticated;

-- ============ UPDATE USERNAME FUNCTION ============
CREATE OR REPLACE FUNCTION update_username(new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(trim(new_name)) < 1 OR length(new_name) > 30 THEN
    RAISE EXCEPTION 'Username must be 1-30 characters';
  END IF;
  UPDATE profiles SET username = trim(new_name) WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_username(text) TO authenticated;