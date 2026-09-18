"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-emerald-70 text-white",
  error: "bg-red-70 text-white",
  info: "bg-jet-black-90 text-white",
};

// Plain-CSS entrance animation (no tailwindcss-animate plugin is installed
// in this project) — a short fade + slide down from above the toast stack.
const TOAST_ANIMATION_STYLES = `
@keyframes toast-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.toast-enter { animation: toast-enter 0.2s ease-out; }
`;

/**
 * App-wide toast host. Mounted once in the root layout — any client
 * component calls useToast() to show a transient, auto-dismissing message
 * instead of an inline banner. Used across the auth module (login, signup,
 * forgot/reset password) for server/API-level errors and successes, while
 * per-field validation stays inline under each input (see FieldError).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), DEFAULT_DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <style>{TOAST_ANIMATION_STYLES}</style>
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:top-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "toast-enter pointer-events-auto w-full max-w-sm rounded-md px-4 py-3 text-[13px] font-semibold shadow-lg",
              variantClasses[toast.variant],
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
