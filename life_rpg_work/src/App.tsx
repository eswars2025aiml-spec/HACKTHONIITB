import { useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/components/Toast";
import { AuthPage } from "@/pages/AuthPage";
import { Layout, type Page } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Quests } from "@/pages/Quests";
import { Shop } from "@/pages/Shop";
import { Inventory } from "@/pages/Inventory";
import { Achievements } from "@/pages/Achievements";
import { HistoryPage } from "@/pages/History";
import { ProfilePage } from "@/pages/Profile";
import { ResetPassword } from "@/pages/ResetPassword";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { session, loading, recoveryMode } = useAuth();
  const [page, setPage] = useState<Page>("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (recoveryMode) return <ResetPassword />;

  return (
    <Layout page={page} onNavigate={setPage}>
      {page === "dashboard" && <Dashboard onNavigate={setPage} />}
      {page === "quests" && <Quests />}
      {page === "shop" && <Shop />}
      {page === "inventory" && <Inventory />}
      {page === "achievements" && <Achievements />}
      {page === "history" && <HistoryPage />}
      {page === "profile" && <ProfilePage />}
    </Layout>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
