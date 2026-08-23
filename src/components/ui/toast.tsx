"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => undefined });

/** One toast style for confirmations, errors and background notices alike. */
export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastTone, typeof Check> = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id));
    }, 2600);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {toasts.map((entry) => {
          const Icon = icons[entry.tone];
          return (
            <div
              key={entry.id}
              className={cn(
                "linq-sheet-up pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2.5",
                "rounded-full bg-surface px-4 py-2.5 text-sm shadow-lg ring-1 ring-line",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  entry.tone === "success" && "text-success",
                  entry.tone === "error" && "text-danger",
                  entry.tone === "info" && "text-accent",
                )}
              />
              <span className="truncate">{entry.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
