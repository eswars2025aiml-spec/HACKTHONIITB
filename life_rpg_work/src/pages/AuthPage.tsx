import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { Swords, Mail, Lock, User, Loader2, ArrowLeft } from "lucide-react";

export function AuthPage() {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "forgot") {
      const { error } = await sendPasswordReset(email);
      if (error) toast(error, "error");
      else toast("Check your email for a reset link.", "success");
    } else if (mode === "signup") {
      if (username.trim().length < 1) {
        toast("Please enter a username", "error");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, username.trim());
      if (error) toast(error, "error");
      else toast("Welcome, adventurer! Your journey begins.", "success");
    } else {
      const { error } = await signIn(email, password);
      if (error) toast(error, "error");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.08),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(244,63,94,0.06),_transparent_50%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/20">
            <Swords className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Life RPG</h1>
          <p className="text-slate-400 text-sm mt-1">Level up your real life</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          {/* Tabs */}
          {mode !== "forgot" && <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl mb-6">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "signin"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "signup"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>}

          {mode === "forgot" && (
            <button type="button" onClick={() => setMode("signin")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-5">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Hero Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your hero name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hero@example.com"
                   autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  required
                />
              </div>
            </div>
            {mode !== "forgot" && <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                   autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                  required
                  minLength={6}
                />
              </div>
            </div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-rose-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "forgot" ? "Send Reset Link" : mode === "signin" ? "Begin Adventure" : "Create Hero"}
            </button>
          </form>
          {mode === "signin" && (
            <button type="button" onClick={() => setMode("forgot")} className="w-full text-center text-sm text-sky-400 hover:text-sky-300 mt-4">
              Forgot your password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
