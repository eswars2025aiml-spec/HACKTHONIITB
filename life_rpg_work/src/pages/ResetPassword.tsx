import { useState } from "react";
import { KeyRound, Loader2, Swords } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

export function ResetPassword() {
  const { updatePassword, clearRecoveryMode } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 6) return toast("Password must be at least 6 characters", "error");
    setSaving(true);
    const { error } = await updatePassword(password);
    if (error) toast(error, "error");
    else { toast("Password reset. Welcome back, hero!", "success"); clearRecoveryMode(); }
    setSaving(false);
  };
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-3xl border border-slate-700/50 bg-slate-900/70 p-8"><div className="flex items-center gap-3 mb-6"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center"><Swords className="w-6 h-6 text-white" /></div><div><h1 className="text-xl font-bold text-white">Reset your password</h1><p className="text-sm text-slate-400">Choose a new key for your account.</p></div></div><form onSubmit={submit} className="space-y-4"><label className="block text-sm text-slate-300">New password<input autoFocus autoComplete="new-password" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500" /></label><button disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 text-white font-semibold flex items-center justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}<KeyRound className="w-4 h-4" /> Set new password</button></form></div></div>;
}