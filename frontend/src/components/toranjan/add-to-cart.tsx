"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

/** How the confirmed state is dressed. `tint` is the chosen one. */
export type ConfirmStyle = "tint" | "solid" | "quiet";

type Phase = "idle" | "adding" | "done";

const WORK_MS = 650;
const CONFIRM_HOLD_MS = 2400;

const CONFIRM_SURFACE: Record<ConfirmStyle, string> = {
  tint: "bg-confirm-tint",
  solid: "bg-confirm",
  quiet: "bg-cta",
};

const CONFIRM_TEXT: Record<ConfirmStyle, string> = {
  tint: "text-confirm-tint-ink border-confirm-tint-ink/25",
  solid: "text-on-confirm border-confirm",
  quiet: "text-on-cta border-cta",
};

/**
 * The tick is drawn rather than faded in: a stroke that completes reads as
 * "this finished", where an icon that simply appears reads as "an icon
 * appeared". `pathLength={1}` normalises the dash maths so the geometry can
 * change without retuning the animation.
 */
function DrawnCheck({ play }: { play: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px]"
      aria-hidden
    >
      <path
        d="M4.5 12.6 9.6 17.7 19.5 6.9"
        pathLength={1}
        strokeDasharray={1}
        // Always the drawn end state; the keyframe supplies the undrawn start.
        // Setting it the other way leaves the tick invisible whenever the
        // animation is skipped — held open for review, or reduced motion.
        strokeDashoffset={0}
        style={
          play
            ? {
                animation:
                  "toranjan-draw 420ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both",
              }
            : undefined
        }
      />
    </svg>
  );
}

/**
 * The label box shared by the two actions on the product page.
 *
 * They sit side by side on a desktop and stack on a phone, and stacked is where
 * it matters: two full-width buttons whose contents are centred put their icons
 * at different x as soon as their labels differ in length — «در خانه‌ی من ببین»
 * is 107px and «افزودن به سبد خرید» is 119px, so the icons sat 8px apart and
 * the labels 10px. Reported as exactly that: the icons should be under each
 * other and the titles under each other.
 *
 * Giving the label a shared *minimum* width makes both icon-and-label blocks
 * one size, so they centre to one place. A minimum rather than a fixed width
 * because a label that outgrows it — the AR button's «not ready yet» sentence,
 * or a future translation — should still fit rather than spill out of the
 * button.
 *
 * It also settles this button's own three states, which are three different
 * lengths and used to shift the icon as they swapped.
 */
export const ACTION_LABEL = "min-w-32 text-center";

/** One label swapped for another, each leaving and arriving behind a mask. */
function SwapLabel({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "col-start-1 row-start-1 flex items-center gap-2.5",
        "transition-[transform,opacity] duration-[420ms] ease-[var(--ease)]",
        show ? "translate-y-0 opacity-100" : "pointer-events-none opacity-0",
        !show && "translate-y-[115%]",
      )}
    >
      {children}
    </span>
  );
}

export function AddToCart({
  confirmStyle = "tint",
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
      }, WORK_MS),
    );
  };

  const done = phase === "done";
  const working = phase === "adding";

  return (
    <button
      type="button"
      onClick={start}
      disabled={phase !== "idle"}
      // A colour change and a tick say nothing to a screen reader, so the
      // outcome is announced in words.
      aria-live="polite"
      className={cn(
        "relative isolate inline-flex w-full items-center justify-center overflow-hidden",
        "rounded-full border px-6 py-3.5 text-[15px] font-medium",
        "transition-[color,border-color] duration-[var(--dur-feedback)] ease-[var(--ease-io)]",
        "active:scale-[.985] disabled:cursor-default",
        done ? CONFIRM_TEXT[confirmStyle] : "border-cta text-on-cta",
        className,
      )}
      style={
        done
          ? { animation: "toranjan-settle 520ms cubic-bezier(0.16, 1, 0.3, 1) both" }
          : undefined
      }
    >
      {/* Resting surface. Sits under the confirmed one so the sweep has
          something to cover rather than something to replace. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-20 bg-cta transition-colors duration-[var(--dur-feedback)]",
          working && "bg-cta-hover",
        )}
      />

      {/* The confirmed surface arrives as a sweep from the leading edge. A
          straight swap reads as a glitch at this size. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 origin-right transition-transform duration-[460ms] ease-[var(--ease)]",
          CONFIRM_SURFACE[confirmStyle],
          done ? "scale-x-100" : "scale-x-0",
        )}
      />

      {/* One ring, opening outward and gone. The beat that says it landed. */}
      {done && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-full border border-confirm-tint-ink/40"
          style={{
            animation:
              "toranjan-ring 620ms cubic-bezier(0.16, 1, 0.3, 1) 90ms both",
          }}
        />
      )}

      {/* Both labels are stacked in one grid cell so the button never changes
          width as the words change. */}
      <span className="grid place-items-center">
        <SwapLabel show={!done && !working}>
          <ShoppingBag className="size-[18px]" />
          <span className={ACTION_LABEL}>افزودن به سبد خرید</span>
        </SwapLabel>

        <SwapLabel show={working}>
          <Loader2 className="size-[18px] animate-spin" />
          <span className={ACTION_LABEL}>در حال افزودن…</span>
        </SwapLabel>

        <SwapLabel show={done}>
          <DrawnCheck play={done && !holdConfirmed} />
          <span className={ACTION_LABEL}>به سبد اضافه شد</span>
        </SwapLabel>
      </span>
    </button>
  );
}
