"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, X } from "lucide-react";

import { EASE_OUT } from "@/components/toranjan/admin-motion";
import { cn } from "@/lib/utils";

/**
 * «It worked» — said where the eye already is.
 *
 * The first version was a small tick beside the panel's heading, and it failed
 * the only test that matters: the shopkeeper pressed «ثبت فرش», the page
 * changed, and nothing told them whether it had worked. A confirmation in the
 * corner of a screen somebody is not looking at is not a confirmation.
 *
 * So it arrives centred at the top, over everything, at a size that cannot be
 * mistaken for chrome — and it says what happened, not «موفق».
 *
 * `role="status"` and `aria-live="polite"`: announced without stealing focus,
 * because the reader is usually mid-sentence somewhere else and being yanked
 * away is worse than being told late.
 */

type Tone = "success" | "failure";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = React.createContext<{
  show: (message: string, tone?: Tone) => void;
} | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <AdminToaster>");
  return context;
}

const LIFETIME = 4200;

export function AdminToaster({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback(
    (message: string, tone: Tone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, tone, message }]);
      // Failures stay until dismissed. A message you needed to read and missed
      // is the whole problem this component exists to fix, and a failure is the
      // one you most need to read.
      if (tone === "success") window.setTimeout(() => dismiss(id), LIFETIME);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
              transition={reduced ? { duration: 0.12 } : { duration: 0.42, ease: EASE_OUT }}
              className={cn(
                "glass-overlay pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-3 ps-5 pe-3 shadow-raised",
                toast.tone === "success"
                  ? "border-status-confirmed/40"
                  : "border-status-cancelled/40",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full",
                  toast.tone === "success"
                    ? "bg-status-confirmed/15 text-status-confirmed"
                    : "bg-status-cancelled/15 text-status-cancelled",
                )}
                aria-hidden
              >
                {toast.tone === "success" ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : (
                  <AlertTriangle className="size-3.5" strokeWidth={2} />
                )}
              </span>

              <p className="text-[14px] leading-relaxed">{toast.message}</p>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="بستن"
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
