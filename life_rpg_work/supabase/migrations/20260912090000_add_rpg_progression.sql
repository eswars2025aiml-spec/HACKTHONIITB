/*
  Life RPG — progression systems

  Adds the catalog, inventory, achievement ledger, and server-side purchase
  and equipment functions. All mutations that affect gold or ownership happen
  in SECURITY DEFINER functions after validating auth.uid().
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION protect_profile_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.bypass_protection', true) = '1' THEN RETURN NEW; END IF;
  IF NEW.xp != OLD.xp OR NEW.gold != OLD.gold OR NEW.level != OLD.level
     OR NEW.strength != OLD.strength OR NEW.intellect != OLD.intellect
     OR NEW.vitality != OLD.vitality OR NEW.creativity != OLD.creativity
     OR NEW.current_streak != OLD.current_streak
     OR NEW.best_streak != OLD.best_streak
     OR NEW.last_completion_date IS DISTINCT FROM OLD.last_completion_date THEN
    RAISE EXCEPTION 'Cannot directly modify profile stats.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  item_type text NOT NULL CHECK (item_type IN ('avatar', 'frame', 'theme', 'badge')),
  price int NOT NULL CHECK (price >= 0),
  icon text NOT NULL DEFAULT 'Sparkles',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Trophy',
  requirement text NOT NULL DEFAULT '',
  target int NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_items_authenticated" ON items;
CREATE POLICY "read_items_authenticated" ON items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "read_own_inventory" ON inventory;
CREATE POLICY "read_own_inventory" ON inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_achievements_authenticated" ON achievements;
CREATE POLICY "read_achievements_authenticated" ON achievements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "read_own_achievements" ON user_achievements;
CREATE POLICY "read_own_achievements" ON user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO items (slug, name, description, item_type, price, icon) VALUES
  ('warrior-avatar', 'Warrior Avatar', 'A battle-tested avatar for your profile.', 'avatar', 100, 'Sword'),
  ('mage-avatar', 'Mage Avatar', 'Arcane style for thoughtful heroes.', 'avatar', 150, 'WandSparkles'),
  ('legendary-frame', 'Legendary Frame', 'A golden frame for legendary progress.', 'frame', 250, 'Crown'),
  ('xp-booster-theme', 'XP Booster Theme', 'A bright theme for your next chapter.', 'theme', 300, 'Zap'),
  ('dungeon-theme', 'Dungeon Theme', 'A deep, shadowy look for focused quests.', 'theme', 350, 'Castle'),
  ('cyber-theme', 'Cyber Theme', 'Neon energy for modern adventurers.', 'theme', 400, 'Cpu'),
  ('profile-badge', 'Quest Badge', 'Show the world you keep your promises.', 'badge', 200, 'BadgeCheck')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO achievements (slug, name, description, icon, requirement, target) VALUES
  ('first-quest', 'First Quest', 'Complete your first quest.', 'Flag', 'quests completed', 1),
  ('quest-master', 'Quest Master', 'Complete ten quests.', 'Crown', 'quests completed', 10),
  ('seven-day-streak', '7 Day Streak', 'Complete a quest on seven consecutive days.', 'Flame', 'current streak', 7),
  ('level-five', 'Level 5', 'Reach level five.', 'Star', 'level', 5),
  ('level-ten', 'Level 10', 'Reach level ten.', 'Sparkles', 'level', 10),
  ('ten-quests', 'Complete 10 Quests', 'Build momentum with ten completed quests.', 'CheckCircle2', 'quests completed', 10),
  ('fifty-quests', 'Complete 50 Quests', 'Become a legend with fifty completed quests.', 'Trophy', 'quests completed', 50)
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

CREATE OR REPLACE FUNCTION sync_best_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.current_streak > NEW.best_streak THEN
    UPDATE profiles SET best_streak = NEW.current_streak WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_best_streak ON profiles;
CREATE TRIGGER trg_sync_best_streak
  AFTER UPDATE OF current_streak ON profiles
  FOR EACH ROW WHEN (NEW.current_streak > NEW.best_streak)
  EXECUTE FUNCTION sync_best_streak();

CREATE OR REPLACE FUNCTION unlock_progress_achievements()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  completed_count int;
  profile_row profiles%ROWTYPE;
BEGIN
  SELECT count(*) INTO completed_count FROM task_completions WHERE user_id = NEW.user_id;
  SELECT * INTO profile_row FROM profiles WHERE id = NEW.user_id;

  INSERT INTO user_achievements (user_id, achievement_id)
  SELECT NEW.user_id, a.id FROM achievements a
  WHERE (a.slug = 'first-quest' AND completed_count >= 1)
     OR (a.slug IN ('quest-master', 'ten-quests') AND completed_count >= 10)
     OR (a.slug = 'fifty-quests' AND completed_count >= 50)
     OR (a.slug = 'seven-day-streak' AND profile_row.current_streak >= 7)
     OR (a.slug = 'level-five' AND profile_row.level >= 5)
     OR (a.slug = 'level-ten' AND profile_row.level >= 10)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_progress_achievements ON task_completions;
CREATE TRIGGER trg_unlock_progress_achievements
  AFTER INSERT ON task_completions FOR EACH ROW
  EXECUTE FUNCTION unlock_progress_achievements();

CREATE OR REPLACE FUNCTION purchase_item(item_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  catalog_item items%ROWTYPE;
  current_gold int;
BEGIN
  SELECT * INTO catalog_item FROM items WHERE id = item_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF EXISTS (SELECT 1 FROM inventory WHERE user_id = auth.uid() AND item_id = item_uuid) THEN
    RAISE EXCEPTION 'You already own this item';
  END IF;
  SELECT gold INTO current_gold FROM profiles WHERE id = auth.uid() FOR UPDATE;
  IF current_gold IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF current_gold < catalog_item.price THEN RAISE EXCEPTION 'Not enough gold'; END IF;

  PERFORM set_config('app.bypass_protection', '1', true);
  UPDATE profiles SET gold = gold - catalog_item.price WHERE id = auth.uid();
  INSERT INTO inventory (user_id, item_id) VALUES (auth.uid(), item_uuid);
  RETURN jsonb_build_object('item_name', catalog_item.name, 'gold_remaining', current_gold - catalog_item.price);
END;
$$;
GRANT EXECUTE ON FUNCTION purchase_item(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION equip_item(item_uuid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item_kind text;
BEGIN
  SELECT i.item_type INTO item_kind
  FROM inventory inv JOIN items i ON i.id = inv.item_id
  WHERE inv.user_id = auth.uid() AND inv.item_id = item_uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item is not in your inventory'; END IF;
  UPDATE inventory inv SET equipped = false
  FROM items i
  WHERE inv.user_id = auth.uid() AND inv.item_id = i.id AND i.item_type = item_kind;
  UPDATE inventory SET equipped = true WHERE user_id = auth.uid() AND item_id = item_uuid;
END;
$$;
GRANT EXECUTE ON FUNCTION equip_item(uuid) TO authenticated;

-- Recreate completion with the bypass set before the protected quest update.
CREATE OR REPLACE FUNCTION complete_quest(quest_uuid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_quest RECORD;
  v_profile RECORD;
  v_new_xp int;
  v_new_level int;
  v_streak int;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT * INTO v_quest FROM quests WHERE id = quest_uuid AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Quest not found or not owned by you'; END IF;
  IF v_quest.completed THEN RAISE EXCEPTION 'Quest already completed'; END IF;
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF v_profile.last_completion_date IS NULL THEN v_streak := 1;
  ELSIF v_profile.last_completion_date = v_today THEN v_streak := v_profile.current_streak;
  ELSIF v_profile.last_completion_date = v_today - 1 THEN v_streak := v_profile.current_streak + 1;
  ELSE v_streak := 1;
  END IF;

  v_new_xp := v_profile.xp + v_quest.xp_reward;
  v_new_level := FLOOR(SQRT(CAST(v_new_xp AS float) / 100.0)) + 1;
  PERFORM set_config('app.bypass_protection', '1', true);
  UPDATE quests SET completed = true, completed_at = now() WHERE id = quest_uuid;
  UPDATE profiles SET
    xp = v_new_xp, gold = gold + v_quest.gold_reward,
    level = GREATEST(v_profile.level, v_new_level),
    current_streak = v_streak, last_completion_date = v_today,
    strength = strength + CASE WHEN v_quest.attribute = 'strength' THEN 1 ELSE 0 END,
    intellect = intellect + CASE WHEN v_quest.attribute = 'intellect' THEN 1 ELSE 0 END,
    vitality = vitality + CASE WHEN v_quest.attribute = 'vitality' THEN 1 ELSE 0 END,
    creativity = creativity + CASE WHEN v_quest.attribute = 'creativity' THEN 1 ELSE 0 END
  WHERE id = auth.uid();
  INSERT INTO task_completions (user_id, quest_id, xp_awarded, gold_awarded, attribute_awarded, attribute_amount)
  VALUES (auth.uid(), quest_uuid, v_quest.xp_reward, v_quest.gold_reward, v_quest.attribute, 1);
  RETURN jsonb_build_object(
    'xp', v_new_xp, 'gold', v_profile.gold + v_quest.gold_reward,
    'level', GREATEST(v_profile.level, v_new_level), 'streak', v_streak,
    'xp_awarded', v_quest.xp_reward, 'gold_awarded', v_quest.gold_reward,
    'attribute_awarded', v_quest.attribute
  );
END;
$$;
GRANT EXECUTE ON FUNCTION complete_quest(uuid) TO authenticated;

-- Keep the client from marking quests complete without the reward function.
CREATE OR REPLACE FUNCTION protect_quest_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.bypass_protection', true) = '1' THEN RETURN NEW; END IF;
  IF NEW.completed IS DISTINCT FROM OLD.completed
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Quest completion must use complete_quest().';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_quest_completion ON quests;
CREATE TRIGGER trg_protect_quest_completion
  BEFORE UPDATE ON quests FOR EACH ROW EXECUTE FUNCTION protect_quest_completion();