"use client";

import { createContext, useContext, useState, useCallback, useId } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContext {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastCtx = createContext<ToastContext | null>(null);

export function useToast(): ToastContext {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const TOAST_COLORS: Record<ToastType, string> = {
  success: "bg-success-50 border-success-200 text-success-800",
  error: "bg-error-50 border-error-200 text-error-800",
  info: "bg-white border-neutral-200 text-neutral-800",
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={15} className="text-success-500 flex-shrink-0 mt-0.5" />,
  error: <AlertCircle size={15} className="text-error-500 flex-shrink-0 mt-0.5" />,
  info: <Info size={15} className="text-brand-500 flex-shrink-0 mt-0.5" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const ctx: ToastContext = {
    success: (m) => add("success", m),
    error: (m) => add("error", m),
    info: (m) => add("info", m),
  };

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm max-w-sm ${TOAST_COLORS[t.type]}`}
            style={{ animation: "toast-slide-in 0.2s ease-out" }}
          >
            {TOAST_ICONS[t.type]}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity -mt-0.5 -mr-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
