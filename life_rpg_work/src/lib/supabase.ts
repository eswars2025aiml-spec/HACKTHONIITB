import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// main.tsx checks this before it renders <App/>, so a missing .env shows a
// clear message instead of a blank screen. This has to be handled here and
// checked before rendering starts — createClient() throws synchronously at
// import time on an empty/invalid URL, which happens before React (or an
// error boundary) exists to catch anything.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill in your Supabase project values."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export type Profile = {
  id: string;
  username: string;
  level: number;
  xp: number;
  gold: number;
  strength: number;
  intellect: number;
  vitality: number;
  creativity: number;
  current_streak: number;
  best_streak: number;
  last_completion_date: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  slug: string;
  name: string;
  description: string;
  item_type: "avatar" | "frame" | "theme" | "badge";
  price: number;
  icon: string;
};

export type InventoryItem = Item & {
  inventory_id: string;
  equipped: boolean;
  purchased_at: string;
};

export type Achievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  target: number;
};

export type UserAchievement = {
  achievement_id: string;
  unlocked_at: string;
};

export type Quest = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: "study" | "coding" | "exercise" | "reading" | "personal" | "other";
  difficulty: "easy" | "medium" | "hard" | "epic";
  xp_reward: number;
  gold_reward: number;
  attribute: "strength" | "intellect" | "vitality" | "creativity";
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type TaskCompletion = {
  id: string;
  user_id: string;
  quest_id: string | null;
  xp_awarded: number;
  gold_awarded: number;
  attribute_awarded: string;
  attribute_amount: number;
  completed_at: string;
};

export type QuestCategory = Quest["category"];
export type QuestDifficulty = Quest["difficulty"];
export type QuestAttribute = Quest["attribute"];

export const CATEGORIES: { value: QuestCategory; label: string; icon: string }[] = [
  { value: "study", label: "Study", icon: "BookOpen" },
  { value: "coding", label: "Coding", icon: "Code" },
  { value: "exercise", label: "Exercise", icon: "Dumbbell" },
  { value: "reading", label: "Reading", icon: "BookMarked" },
  { value: "personal", label: "Personal", icon: "Heart" },
  { value: "other", label: "Other", icon: "Sparkles" },
];

export const DIFFICULTIES: {
  value: QuestDifficulty;
  label: string;
  color: string;
  xpRange: string;
}[] = [
  { value: "easy", label: "Easy", color: "emerald", xpRange: "10-30 XP" },
  { value: "medium", label: "Medium", color: "amber", xpRange: "30-60 XP" },
  { value: "hard", label: "Hard", color: "orange", xpRange: "60-100 XP" },
  { value: "epic", label: "Epic", color: "rose", xpRange: "100-200 XP" },
];

export const ATTRIBUTES: {
  value: QuestAttribute;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "strength", label: "Strength", icon: "Sword", color: "rose" },
  { value: "intellect", label: "Intellect", icon: "Brain", color: "sky" },
  { value: "vitality", label: "Vitality", icon: "Heart", color: "emerald" },
  { value: "creativity", label: "Creativity", icon: "Palette", color: "amber" },
];

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpProgress(xp: number): { current: number; needed: number; percent: number } {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const intoLevel = xp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  const percent = needed > 0 ? Math.min(100, (intoLevel / needed) * 100) : 100;
  return { current: intoLevel, needed, percent };
}
