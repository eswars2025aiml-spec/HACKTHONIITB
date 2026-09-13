import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase, xpProgress, type Quest } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ArrowRight, Brain, CalendarDays, CheckCircle2, Coins, Flame, Heart, ListTodo, Palette, Plus, Shield, Sparkles, Sword, Target, Trophy, Zap, Crosshair, Timer, RotateCcw } from "lucide-react";
import type { Page } from "@/components/Layout";

type Recent = { id: string; xp_awarded: number; gold_awarded: number; completed_at: string; quests: { title: string } | null };

export function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ xp: number; gold: number; levelUp: boolean } | null>(null);
  const [focusIds, setFocusIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("life-rpg-focus") || "[]"); } catch { return []; }
  });

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const [q, c] = await Promise.all([
      supabase.from("quests").select("*").eq("completed", false).order("created_at", { ascending: false }).limit(12),
      supabase.from("task_completions").select("id,xp_awarded,gold_awarded,completed_at,quests(title)").order("completed_at", { ascending: false }).limit(5),
    ]);
    if (q.error) toast(q.error.message, "error"); else setQuests((q.data ?? []) as Quest[]);
    if (!c.error) setRecent((c.data ?? []) as Recent[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [profile]);

  const complete = async (quest: Quest) => {
    if (completing) return;
    const oldLevel = profile?.level ?? 1;
    setCompleting(quest.id);
    try {
      const { data, error } = await supabase.rpc("complete_quest", { quest_uuid: quest.id });
      if (error) throw error;
      const freshProfile = await refreshProfile();
      const newLevel = freshProfile?.level ?? oldLevel;
      const levelUp = newLevel > oldLevel;
      setFocusIds(ids => ids.filter(id => id !== quest.id));
      persistFocus(focusIds.filter(id => id !== quest.id));
      setCelebration({ xp: data.xp_awarded, gold: data.gold_awarded, levelUp });
      toast(levelUp ? "LEVEL UP! Your character just got stronger." : `Quest cleared · +${data.xp_awarded} XP · +${data.gold_awarded} Gold`, "success");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Unable to complete quest", "error");
    } finally { setCompleting(null); }
  };

  const toggleFocus = (id: string) => {
    setFocusIds(current => {
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id].slice(-3);
      persistFocus(next);
      return next;
    });
  };

  const resetFocus = () => { setFocusIds([]); localStorage.removeItem("life-rpg-focus"); };

  const greeting = useMemo(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }, []);

  if (!profile) return <div className="panel grid min-h-[420px] place-items-center p-8 text-center"><div><Shield className="mx-auto h-10 w-10 text-sky-400" /><h2 className="mt-4 text-xl font-bold">Character data unavailable</h2><p className="mt-2 text-sm text-slate-500">Your sign-in is active, but the profile record is not ready yet. Check the Supabase migrations.</p></div></div>;

  const progress = xpProgress(profile.xp);
  const focusQuests = focusIds.map(id => quests.find(q => q.id === id)).filter(Boolean) as Quest[];
  const displayFocus = focusQuests.length ? focusQuests : quests.slice(0, 3);
  const dueToday = quests.filter(q => q.due_date === localDate()).length;
  const overdue = quests.filter(q => q.due_date && q.due_date < localDate()).length;
  const statsTotal = profile.strength + profile.intellect + profile.vitality + profile.creativity;
  const focusDone = focusQuests.length === 0 && focusIds.length > 0;

  return <div className="space-y-6 animate-enter">
    <section className="hero-panel relative overflow-hidden p-6 sm:p-8 lg:p-10">
      <div className="absolute -right-28 -top-28 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
        <div>
          <div className="eyebrow text-sky-300">{greeting}, {profile.username}</div>
          <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">Build a life you’d actually <span className="gradient-text">want to play.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Your day is a game board. Pick a few meaningful missions, clear them, and let the character sheet prove you’re moving forward.</p>
          <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => onNavigate("quests")} className="btn-primary"><Plus className="h-4 w-4" /> Create mission</button><button onClick={() => onNavigate("profile")} className="btn-secondary"><Sparkles className="h-4 w-4" /> Open character</button></div>
        </div>
        <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-black/25 p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between"><div><div className="eyebrow">Level {profile.level}</div><div className="mt-1 text-lg font-black text-white">Power curve</div></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-violet-300"><Trophy className="h-5 w-5" /></div></div>
          <div className="mx-auto mt-6 grid h-40 w-40 place-items-center rounded-full" style={{ background: `conic-gradient(rgb(56 189 248) ${progress.percent}%, rgba(255,255,255,.06) ${progress.percent}% 100%)` }}>
            <div className="grid h-32 w-32 place-items-center rounded-full bg-[#0c121b] text-center"><div><div className="text-3xl font-black text-white">{Math.round(progress.percent)}%</div><div className="text-[11px] uppercase tracking-wider text-slate-600">to next level</div></div></div>
          </div>
          <div className="mt-5 flex justify-between text-xs text-slate-500"><span>{progress.current.toLocaleString()} XP banked</span><span>{progress.needed.toLocaleString()} needed</span></div>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Gold" value={profile.gold.toLocaleString()} icon={Coins} accent="amber" sub="Guild currency" /><Stat label="Streak" value={`${profile.current_streak}d`} icon={Flame} accent="orange" sub={`Best ${profile.best_streak}d`} /><Stat label="Total XP" value={profile.xp.toLocaleString()} icon={Zap} accent="sky" sub="Lifetime progress" /><Stat label="Quest power" value={statsTotal} icon={Target} accent="violet" sub={`${dueToday} due · ${overdue} late`} /></section>

    <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className="panel p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="eyebrow text-violet-300">Daily loadout</div><h2 className="mt-1 text-xl font-black text-white">Pick your 3 missions.</h2><p className="mt-1 text-sm text-slate-600">A focused day beats a giant backlog.</p></div><div className="flex gap-2"><button onClick={resetFocus} className="btn-secondary !rounded-xl !px-3 !py-2"><RotateCcw className="h-4 w-4" /> Reset</button><button onClick={() => onNavigate("quests")} className="btn-secondary !rounded-xl !px-3 !py-2"><ListTodo className="h-4 w-4" /> Board</button></div></div>
        {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.035]" />)}</div> : displayFocus.length === 0 ? <EmptyFocus onNavigate={onNavigate} /> : <div className="space-y-3">{displayFocus.map(q => <FocusRow key={q.id} quest={q} selected={focusIds.includes(q.id)} busy={completing === q.id} onToggle={() => toggleFocus(q.id)} onComplete={() => complete(q)} />)}</div>}
        {focusDone && <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4 text-sm text-emerald-200">All focus missions cleared. Nice. Your next move can be something ambitious.</div>}
      </div>

      <div className="space-y-6">
        <div className="panel p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400/10 text-orange-300"><Flame className="h-5 w-5" /></div><div><div className="eyebrow">Momentum</div><h2 className="mt-1 text-xl font-black text-white">Protect the streak.</h2></div></div><div className="mt-6 grid grid-cols-7 gap-1.5">{Array.from({length: 7}, (_,i) => <div key={i} className={`h-10 rounded-xl border ${i >= 7 - Math.min(profile.current_streak, 7) ? "border-orange-400/20 bg-orange-400/15" : "border-white/[0.05] bg-white/[0.025]"}`} />)}</div><div className="mt-4 flex items-end justify-between"><div><div className="text-3xl font-black text-white">{profile.current_streak}<span className="ml-1 text-sm text-slate-600">days</span></div><div className="text-xs text-slate-600">Current streak</div></div><div className="text-right"><div className="text-lg font-black text-orange-300">{profile.best_streak}</div><div className="text-xs text-slate-600">Best streak</div></div></div></div>
        <div className="panel p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">Adventure log</div><h2 className="mt-1 text-xl font-black text-white">Recent victories</h2></div><button onClick={() => onNavigate("history")} className="rounded-xl p-2 text-slate-500 hover:bg-white/[0.05] hover:text-white"><ArrowRight className="h-4 w-4" /></button></div><div className="mt-4 space-y-2">{recent.length ? recent.map(r => <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.025] p-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-200">{r.quests?.title ?? "Quest completed"}</div><div className="text-xs text-slate-700">{new Date(r.completed_at).toLocaleString()}</div></div><div className="text-right"><div className="text-xs font-bold text-sky-300">+{r.xp_awarded} XP</div><div className="text-[10px] text-amber-300">+{r.gold_awarded} G</div></div></div>) : <div className="rounded-2xl bg-white/[0.025] p-4 text-sm text-slate-600">No completed quests yet. Your first win is waiting.</div>}</div></div>
      </div>
    </section>

    {celebration && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={() => setCelebration(null)}><div className="panel pop-card w-full max-w-md overflow-hidden p-7 text-center" onMouseDown={e => e.stopPropagation()}><div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-2xl shadow-violet-500/25"><Trophy className="h-9 w-9" /></div><div className="eyebrow mt-5 text-sky-300">Victory registered</div><h2 className="mt-1 text-3xl font-black text-white">{celebration.levelUp ? "LEVEL UP" : "Mission cleared"}</h2><p className="mt-2 text-sm text-slate-500">Consistency is becoming part of your character.</p><div className="mt-6 grid grid-cols-2 gap-3"><Reward label="XP gained" value={`+${celebration.xp}`} icon={Zap} /><Reward label="Gold gained" value={`+${celebration.gold}`} icon={Coins} /></div>{celebration.levelUp && <div className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-400/[0.06] p-4 text-sm text-violet-200">New level unlocked. Check your character sheet for the latest progression.</div>}<button onClick={() => setCelebration(null)} className="btn-primary mt-6 w-full">Continue adventure</button></div></div>}
  </div>;
}

function Reward({label, value, icon: Icon}:{label:string;value:string;icon:typeof Coins}) { return <div className="rounded-2xl bg-white/[0.035] p-4"><Icon className="mx-auto h-4 w-4 text-slate-500"/><div className="mt-2 text-lg font-black text-white">{value}</div><div className="text-xs text-slate-600">{label}</div></div>; }
function Stat({label,value,icon:Icon,accent,sub}:{label:string;value:string;icon:typeof Coins;accent:string;sub:string}){ const c=accent==="amber"?"bg-amber-400/10 text-amber-300":accent==="orange"?"bg-orange-400/10 text-orange-300":accent==="sky"?"bg-sky-400/10 text-sky-300":"bg-violet-400/10 text-violet-300"; return <div className="panel p-4"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div><div className={`grid h-9 w-9 place-items-center rounded-xl ${c}`}><Icon className="h-4 w-4" /></div></div><div className="mt-3 text-[11px] text-slate-600">{sub}</div></div> }
function FocusRow({quest,selected,busy,onToggle,onComplete}:{quest:Quest;selected:boolean;busy:boolean;onToggle:()=>void;onComplete:()=>void}){ const overdue=!!quest.due_date&&quest.due_date<localDate(); return <div className={`group flex flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-center ${selected?"border-sky-400/20 bg-sky-400/[0.04]":"border-white/[0.06] bg-white/[0.02]"}`}><button onClick={onToggle} className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${selected?"border-sky-400/20 bg-sky-400/10 text-sky-300":"border-white/[0.06] bg-white/[0.025] text-slate-600"}`} aria-label="Toggle focus"><Crosshair className="h-5 w-5" /></button><div className="min-w-0 flex-1"><div className="truncate font-bold text-white">{quest.title}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="capitalize">{quest.category}</span><span>•</span><span>{quest.difficulty}</span>{quest.due_date&&<><span>•</span><span className={overdue?"text-rose-300":""}><CalendarDays className="mr-1 inline h-3 w-3" />{new Date(quest.due_date).toLocaleDateString()}{overdue?" · late":""}</span></>}</div></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs font-bold text-sky-300">+{quest.xp_reward} XP</span><button onClick={onComplete} disabled={busy} className="btn-primary !rounded-xl !px-3 !py-2">{busy?<Timer className="h-4 w-4 animate-pulse"/>:<CheckCircle2 className="h-4 w-4" />}<span className="sr-only">Complete</span></button></div></div>; }
function EmptyFocus({onNavigate}:{onNavigate:(p:Page)=>void}) { return <div className="rounded-2xl border border-dashed border-white/[0.09] p-10 text-center"><Target className="mx-auto h-9 w-9 text-sky-300"/><h3 className="mt-3 font-bold text-white">Your board is clear.</h3><p className="mt-1 text-sm text-slate-600">Create a few small missions and turn today into a visible win.</p><button onClick={()=>onNavigate("quests")} className="btn-primary mt-5">Add first mission</button></div>; }
function persistFocus(ids:string[]) { try { localStorage.setItem("life-rpg-focus", JSON.stringify(ids)); } catch {} }
function localDate(){return new Intl.DateTimeFormat("en-CA").format(new Date())}
