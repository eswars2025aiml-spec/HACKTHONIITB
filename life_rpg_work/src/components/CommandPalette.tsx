import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Command, Search } from "lucide-react";
import type { Page } from "@/components/Layout";

type Item = { id: Page; label: string; hint: string };

export function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (p: Page) => void }) {
  const [query, setQuery] = useState("");
  const items: Item[] = [
    { id: "dashboard", label: "Overview", hint: "Your daily command center" },
    { id: "quests", label: "Quests", hint: "Create and complete missions" },
    { id: "shop", label: "Guild Shop", hint: "Spend your gold" },
    { id: "inventory", label: "Inventory", hint: "Equip your items" },
    { id: "achievements", label: "Achievements", hint: "Milestones and badges" },
    { id: "history", label: "History", hint: "Review your wins" },
    { id: "profile", label: "Profile", hint: "Character sheet" },
  ];

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => items.filter(item => `${item.label} ${item.hint}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  if (!open) return null;

  return <div className="fixed inset-0 z-[60] bg-black/70 p-4 backdrop-blur-md" onMouseDown={onClose}>
    <div className="mx-auto mt-[10vh] w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/[0.1] bg-[#0b1018]/95 shadow-2xl shadow-black/50" onMouseDown={e => e.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
        <Search className="h-5 w-5 text-slate-500" />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Jump to a page…" className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-600" />
        <kbd className="rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] font-bold text-slate-500">ESC</kbd>
      </div>
      <div className="p-2">
        {filtered.map(item => <button key={item.id} onClick={() => { onNavigate(item.id); onClose(); }} className="group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-white/[0.05]">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-sky-300"><Command className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1"><div className="font-bold text-white">{item.label}</div><div className="text-xs text-slate-600">{item.hint}</div></div>
          <ArrowRight className="h-4 w-4 text-slate-700 transition group-hover:text-slate-300" />
        </button>)}
        {!filtered.length && <div className="p-8 text-center text-sm text-slate-600">No destination matches “{query}”.</div>}
      </div>
    </div>
  </div>;
}
