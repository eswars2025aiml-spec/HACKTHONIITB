import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
  refreshProfile: () => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function withTimeout<T>(promise: PromiseLike<T>, ms = 9000): Promise<T> {
  return await Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out. Check your Supabase connection.")), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
      );
      if (error) throw error;

      if (!data) {
        // Self-heal accounts created before the profile trigger/migration was active.
        const { data: repaired, error: repairError } = await withTimeout(
          supabase.rpc("ensure_my_profile")
        );
        if (repairError) throw repairError;
        const repairedProfile = repaired as Profile | null;
        setProfile(repairedProfile);
        return repairedProfile;
      }

      const next = data as Profile;
      setProfile(next);
      return next;
    } catch (error) {
      console.error("Failed to load profile:", error);
      setProfile(null);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) return await loadProfile(session.user.id);
    return null;
  }, [session, loadProfile]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) await loadProfile(data.session.user.id);
      if (mounted) setLoading(false);
    }).catch((error) => {
      console.error(error);
      if (mounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(newSession);
      if (newSession?.user?.id) {
        void loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    try { const { error } = await supabase.auth.signInWithPassword({ email, password }); return { error: error?.message ?? null }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Unable to sign in" }; }
  };
  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
      if (error) return { error: error.message };
      if (data.user) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) return { error: signInError.message };
      }
      return { error: null };
    } catch (error) { return { error: error instanceof Error ? error.message : "Unable to create account" }; }
  };
  const signOut = async () => { await supabase.auth.signOut(); setProfile(null); setSession(null); };
  const sendPasswordReset = async (email: string) => { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); return { error: error?.message ?? null }; };
  const updatePassword = async (password: string) => { const { error } = await supabase.auth.updateUser({ password }); return { error: error?.message ?? null }; };

  return <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, sendPasswordReset, updatePassword, recoveryMode, clearRecoveryMode: () => setRecoveryMode(false), refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
