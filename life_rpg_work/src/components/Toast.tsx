import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md border animate-toast-in cursor-pointer ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-100"
                : t.type === "error"
                ? "bg-rose-950/90 border-rose-600/50 text-rose-100"
                : "bg-slate-950/90 border-slate-600/50 text-slate-100"
            }`}
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {t.type === "error" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {t.type === "info" && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <X className="w-4 h-4 opacity-50 hover:opacity-100 shrink-0" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
