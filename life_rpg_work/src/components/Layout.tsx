import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Scroll, LogOut, Menu, X, ShoppingBag, Backpack, Trophy, History, UserCircle, Swords, Coins, Flame, Sparkles, Search } from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";

export type Page = "dashboard" | "quests" | "shop" | "inventory" | "achievements" | "history" | "profile";

export function Layout({ page, onNavigate, children }: { page: Page; onNavigate: (p: Page) => void; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard }, { id: "quests", label: "Quests", icon: Scroll }, { id: "shop", label: "Guild Shop", icon: ShoppingBag },
    { id: "inventory", label: "Inventory", icon: Backpack }, { id: "achievements", label: "Achievements", icon: Trophy }, { id: "history", label: "History", icon: History }, { id: "profile", label: "Profile", icon: UserCircle },
  ];
  const navigate = (p: Page) => { onNavigate(p); setMobileOpen(false); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? "HR";

  const Nav = ({ mobile = false }: { mobile?: boolean }) => <nav className={`space-y-1 ${mobile ? "" : "flex-1 overflow-y-auto"}`}>
    {navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(id)} className={`group w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition ${page === id ? "bg-white/[0.08] text-white shadow-inner" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}><Icon className={`h-5 w-5 ${page === id ? "text-sky-300" : "text-slate-500 group-hover:text-slate-300"}`} />{label}</button>)}
  </nav>;

  return <div className="min-h-screen overflow-x-hidden bg-[#080b12] text-slate-100">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,.10),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(139,92,246,.10),transparent_30%)]" />
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-white/[0.06] bg-[#0a0f17]/95 px-4 py-5 backdrop-blur-2xl md:flex md:flex-col">
      <button onClick={() => navigate("dashboard")} className="mb-5 flex items-center gap-3 rounded-2xl px-2 py-2 text-left">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-lg shadow-sky-500/20"><Swords className="h-5 w-5" /></div>
        <div><div className="text-lg font-black tracking-tight">Life RPG</div><div className="text-[11px] font-semibold uppercase tracking-[.22em] text-slate-600">Build your legend</div></div>
      </button>
      {profile && <div className="mb-5 rounded-3xl bg-gradient-to-br from-sky-500/10 to-violet-500/10 p-4 ring-1 ring-white/[0.06]">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 font-black">{initials}</div><div className="min-w-0 flex-1"><div className="truncate font-bold text-white">{profile.username}</div><div className="text-xs text-slate-500">Level {profile.level} adventurer</div></div><Sparkles className="h-4 w-4 text-violet-300" /></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-black/20 px-3 py-2"><div className="flex items-center gap-1 text-amber-300"><Coins className="h-3.5 w-3.5" /> Gold</div><div className="mt-1 text-sm font-bold text-white">{profile.gold.toLocaleString()}</div></div><div className="rounded-xl bg-black/20 px-3 py-2"><div className="flex items-center gap-1 text-orange-300"><Flame className="h-3.5 w-3.5" /> Streak</div><div className="mt-1 text-sm font-bold text-white">{profile.current_streak} days</div></div></div>
      </div>}
      <button onClick={() => setPaletteOpen(true)} className="mb-3 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"><Search className="h-4 w-4" /><span className="flex-1 text-left">Quick jump</span><kbd className="rounded-lg border border-white/[0.06] px-2 py-1 text-[10px] text-slate-600">⌘K</kbd></button>
      <Nav />
      <button onClick={signOut} className="mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"><LogOut className="h-5 w-5" /> Sign out</button>
    </aside>

    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080b12]/80 px-4 py-3 backdrop-blur-xl md:hidden"><div className="flex items-center justify-between"><button onClick={() => navigate("dashboard")} className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500"><Swords className="h-4 w-4" /></div><span className="font-black">Life RPG</span></button><div className="flex items-center gap-1"><button aria-label="Quick jump" onClick={() => setPaletteOpen(true)} className="rounded-xl p-2 text-slate-400 hover:bg-white/[0.05]"><Search className="h-5 w-5" /></button><button onClick={() => setMobileOpen(v => !v)} className="rounded-xl p-2 text-slate-400 hover:bg-white/[0.05]">{mobileOpen ? <X /> : <Menu />}</button></div></div>{mobileOpen && <div className="pt-3"><Nav mobile /><button onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold text-slate-500"><LogOut className="h-5 w-5" /> Sign out</button></div>}</header>

    <main className="relative md:ml-[260px]"><div className="mx-auto w-full max-w-[1450px] p-4 pb-12 sm:p-6 lg:p-8">{children}</div></main>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />
  </div>;
}
