/*
  Life RPG — security fixes

  1. Reward tampering: "update_own_quests" (migration 1) let the owner UPDATE
     every column on their own quest row, including xp_reward/gold_reward,
     with no upper bound tied to difficulty. That let a player edit an
     incomplete quest's reward up to the 1000/1000 cap, save, then complete
     it for max payout — repeatable on any quest, through the normal Edit
     Quest form. Reward fields must be fixed at creation time.

  2. Lost XP under concurrent completions: complete_quest() read the profile
     row with a plain SELECT and wrote back an absolute xp value computed
     from that snapshot. Two completions close together (double-click, two
     tabs) could both read the same starting xp, and the second UPDATE would
     overwrite the first's gain — the quest still gets marked completed and
     logged in task_completions, but the profile's total xp doesn't reflect
     it. purchase_item() already uses SELECT ... FOR UPDATE for this same
     reason; complete_quest() needs the same lock.
*/

-- ============ 1. LOCK REWARD FIELDS AFTER CREATION ============
-- Only these columns remain directly editable by the owner. xp_reward,
-- gold_reward, completed, completed_at, user_id, id, and created_at can no
-- longer be changed by a direct client UPDATE — completed/completed_at were
-- already covered by the protect_quest_completion trigger; this closes the
-- gap for the reward columns using the same column-grant pattern already
-- used on profiles.
REVOKE UPDATE ON quests FROM authenticated;
GRANT UPDATE (title, description, category, difficulty, attribute, due_date)
  ON quests TO authenticated;

-- ============ 2. FIX THE LOST-UPDATE RACE IN complete_quest() ============
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

  -- FOR UPDATE locks this row until the transaction ends, so a second
  -- concurrent completion for the same user blocks here and re-reads the
  -- already-updated row instead of computing from a stale snapshot.
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid() FOR UPDATE;
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
