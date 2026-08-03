"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

/** How the confirmed state is dressed. Three candidates, one to be chosen. */
export type ConfirmStyle = "solid" | "tint" | "quiet";

type Phase = "idle" | "adding" | "done";

const CONFIRM_HOLD_MS = 2200;

const CONFIRM_CLASSES: Record<ConfirmStyle, string> = {
  // Warmest and loudest. The one warm colour in the system, held briefly.
  solid: "bg-confirm text-on-confirm border-confirm",
  // The same warmth at a whisper, for a shop that stays quiet.
  tint: "bg-confirm-tint text-confirm-tint-ink border-confirm-tint-ink/25",
  // Surface never changes; only the mark and the words do.
  quiet: "bg-cta text-on-cta border-cta",
};

export function AddToCart({
  confirmStyle = "solid",
  onAdd,
  className,
  /** Holds the confirmed state open. Only the design-review page uses it —
      the state is otherwise too brief to compare three of them side by side. */
  holdConfirmed = false,
}: {
  confirmStyle?: ConfirmStyle;
  onAdd?: () => void;
  className?: string;
  holdConfirmed?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(holdConfirmed ? "done" : "idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Both timers have to be cleared on unmount, or a card scrolled away
  // mid-confirmation sets state on something that is no longer mounted.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const start = () => {
    if (holdConfirmed || phase !== "idle") return;
    setPhase("adding");
    timers.current.push(
      setTimeout(() => {
        setPhase("done");
        onAdd?.();
        timers.current.push(setTimeout(() => setPhase("idle"), CONFIRM_HOLD_MS));
      }, 650),
    );
  };

  const done = phase === "done";

  return (
    <button
      type="button"
      onClick={start}
      // The live region announces the confirmation, because a colour change
      // and a tick say nothing to a screen reader.
      aria-live="polite"
      className={cn(
        "relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden",
        "rounded-full border px-6 py-3.5 text-[15px] font-medium",
        "transition-[background-color,color,border-color,transform] duration-[var(--dur-feedback)] ease-[var(--ease-io)]",
        "active:scale-[.985] disabled:cursor-default",
        done
          ? CONFIRM_CLASSES[confirmStyle]
          : "border-cta bg-cta text-on-cta hover:bg-cta-hover",
        className,
      )}
      disabled={phase !== "idle"}
    >
      {/* The confirmed colour arrives as a sweep from the leading edge rather
          than a straight swap — a hard cut reads as a glitch at this size. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 origin-right transition-transform duration-[420ms] ease-[var(--ease)]",
          done ? "scale-x-100" : "scale-x-0",
          confirmStyle === "solid" && "bg-confirm",
          confirmStyle === "tint" && "bg-confirm-tint",
          confirmStyle === "quiet" && "bg-cta",
        )}
      />

      <span className="relative flex items-center gap-2.5">
        {phase === "adding" ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : done ? (
          <Check
            className={cn(
              "size-[18px]",
              // in the quiet treatment the tick is the only gold on the button
              confirmStyle === "quiet" && "text-accent",
            )}
          />
        ) : (
          <ShoppingBag className="size-[18px]" />
        )}
        <span>
          {phase === "adding"
            ? "در حال افزودن…"
            : done
              ? "به سبد اضافه شد"
              : "افزودن به سبد"}
        </span>
      </span>
    </button>
  );
}
