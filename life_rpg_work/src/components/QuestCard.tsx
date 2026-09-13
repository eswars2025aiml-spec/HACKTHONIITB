import { useState } from "react";
import type { Quest } from "@/lib/supabase";
import { CATEGORIES, DIFFICULTIES, ATTRIBUTES } from "@/lib/supabase";
import {
  BookOpen,
  Code,
  Dumbbell,
  BookMarked,
  Heart,
  Sparkles,
  CheckCircle2,
  Pencil,
  Trash2,
  Calendar,
  Coins,
  Zap,
  Loader2,
} from "lucide-react";

const ICON_MAP: Record<string, typeof BookOpen> = {
  BookOpen,
  Code,
  Dumbbell,
  BookMarked,
  Heart,
  Sparkles,
};

const DIFFICULTY_STYLES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  easy: { border: "border-emerald-600/40", bg: "bg-emerald-950/30", text: "text-emerald-400", glow: "hover:shadow-emerald-500/10" },
  medium: { border: "border-amber-600/40", bg: "bg-amber-950/30", text: "text-amber-400", glow: "hover:shadow-amber-500/10" },
  hard: { border: "border-orange-600/40", bg: "bg-orange-950/30", text: "text-orange-400", glow: "hover:shadow-orange-500/10" },
  epic: { border: "border-rose-600/40", bg: "bg-rose-950/30", text: "text-rose-400", glow: "hover:shadow-rose-500/20" },
};

const ATTRIBUTE_COLORS: Record<string, string> = {
  strength: "text-rose-400",
  intellect: "text-sky-400",
  vitality: "text-emerald-400",
  creativity: "text-amber-400",
};

export function QuestCard({
  quest,
  onComplete,
  onEdit,
  onDelete,
}: {
  quest: Quest;
  onComplete: (quest: Quest) => Promise<void>;
  onEdit: (quest: Quest) => void;
  onDelete: (quest: Quest) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cat = CATEGORIES.find((c) => c.value === quest.category) ?? CATEGORIES[5];
  const diff = DIFFICULTIES.find((d) => d.value === quest.difficulty) ?? DIFFICULTIES[0];
  const attr = ATTRIBUTES.find((a) => a.value === quest.attribute) ?? ATTRIBUTES[0];
  const Icon = ICON_MAP[cat.icon] ?? Sparkles;
  const diffStyle = DIFFICULTY_STYLES[quest.difficulty] ?? DIFFICULTY_STYLES.easy;

  const dueDate = quest.due_date ? new Date(quest.due_date) : null;
  const isOverdue = dueDate && !quest.completed && dueDate < new Date(new Date().toDateString());
  const dueLabel = dueDate
    ? dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "No due date";

  const handleComplete = async () => {
    setCompleting(true);
    setJustCompleted(true);
    try {
      await onComplete(quest);
    } catch {
      setJustCompleted(false);
    }
    setCompleting(false);
  };

  if (quest.completed) {
    return (
      <div className={`relative rounded-2xl border ${diffStyle.border} bg-slate-900/40 p-5 overflow-hidden transition-all`}>
        {justCompleted && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent animate-complete-sweep pointer-events-none" />
        )}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${diffStyle.bg} flex items-center justify-center opacity-60`}>
              <Icon className={`w-5 h-5 ${diffStyle.text} opacity-60`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-400 line-through">{quest.title}</h3>
              <p className="text-xs text-slate-600">Completed</p>
            </div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500/60 shrink-0" />
        </div>
        {quest.description && (
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">{quest.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full ${diffStyle.bg} ${diffStyle.text} opacity-60`}>
            {diff.label}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/50 text-slate-500">
            +{quest.xp_reward} XP
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/50 text-slate-500">
            +{quest.gold_reward} Gold
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-2xl border ${diffStyle.border} bg-slate-900/60 p-5 overflow-hidden transition-all duration-300 hover:border-slate-600/60 hover:bg-slate-900/80 hover:shadow-xl ${diffStyle.glow} hover:-translate-y-0.5`}
    >
      {justCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-emerald-400/10 to-transparent animate-complete-sweep pointer-events-none z-10" />
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${diffStyle.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
            <Icon className={`w-5 h-5 ${diffStyle.text}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{quest.title}</h3>
            <p className="text-xs text-slate-500 capitalize">{cat.label}</p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(quest)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-950/30 transition-all opacity-0 group-hover:opacity-100"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {confirmDelete ? (
            <button
              onClick={() => onDelete(quest)}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all"
            >
              Delete?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setTimeout(() => setConfirmDelete(false), 2000)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {quest.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{quest.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs px-2.5 py-1 rounded-full ${diffStyle.bg} ${diffStyle.text} font-medium`}>
          {diff.label}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/60 text-slate-300 flex items-center gap-1">
          <Zap className="w-3 h-3 text-sky-400" />
          {quest.xp_reward} XP
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/60 text-slate-300 flex items-center gap-1">
          <Coins className="w-3 h-3 text-amber-400" />
          {quest.gold_reward}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full bg-slate-800/60 ${ATTRIBUTE_COLORS[quest.attribute]} capitalize`}>
          {attr.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs flex items-center gap-1.5 ${isOverdue ? "text-rose-400" : "text-slate-500"}`}>
          <Calendar className="w-3.5 h-3.5" />
          {dueLabel}
          {isOverdue && " · Overdue"}
        </span>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all hover:shadow-emerald-500/40 disabled:opacity-50"
        >
          {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Complete
        </button>
      </div>
    </div>
  );
}
