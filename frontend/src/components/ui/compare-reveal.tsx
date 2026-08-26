"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useVisibilityPause } from "@/lib/use-visibility-pause";

/**
 * A before/after comparator: two pictures stacked, and a divider you drag.
 *
 * Adapted from Motiq's `compare-reveal` (MIT). What arrived was styled for a
 * dark developer-tools palette and shipped its own `--motiq-*` token block; the
 * tokens are gone and every colour here is now the shop's. The simulation — a
 * spring the divider chases, and the one-time sweep that demonstrates the
 * control on first sight — is the part worth keeping and is untouched.
 *
 * **Two things were changed rather than restyled:**
 *
 * 1. *Touch no longer jumps.* Upstream, `pointerdown` anywhere on the frame
 *    threw the divider to that x immediately. On a phone the frame is most of
 *    the screen, so the first touch of a downward scroll snapped the picture
 *    in half before the browser had decided the gesture was a scroll at all.
 *    A pen or finger now has to travel 6px horizontally — and more
 *    horizontally than vertically — before anything moves. A mouse still
 *    positions on click, because there the click *is* the instruction.
 *
 * 2. *The labels read as prose.* `font-mono uppercase tracking-[0.12em]` is
 *    fine for «BEFORE»; letter-spacing takes Persian words apart at the joins.
 *
 * Left/right stay physical (`left`, `right`, `clip-path` from the left edge)
 * under `dir="rtl"`, which is correct: dragging is a physical act, not a
 * reading order. Which picture belongs on which side is the caller's decision.
 */

/**
 * A comparison side.
 *
 * Upstream also accepted `{ src, alt }` and rendered its own `<img>`. That
 * shorthand is gone: the one thing this shop compares is a pair of
 * art-directed `<picture>` elements — a landscape room and a portrait room,
 * chosen by media query — which the shorthand could not express anyway.
 */
export type CompareRevealSource = React.ReactNode;

export interface CompareRevealProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The "before" side, revealed from the left edge to the divider. */
  before: CompareRevealSource;
  /** The "after" side, filling the rest of the frame. */
  after: CompareRevealSource;
  /** Uncontrolled starting divider position, 0–100. */
  defaultPosition?: number;
  /** Controlled divider position, 0–100. */
  position?: number;
  /** Fires with the new target percentage on drag, key, or snap. */
  onPositionChange?: (pct: number) => void;
  /** Play the one-time self-demonstrating sweep on first viewport entry. */
  introSweep?: boolean;
  /** Divider spring — 140/18 (ζ≈0.76) reads as elastic resistance. */
  stiffness?: number;
  damping?: number;
  /** Corner chips, [before, after]. */
  labels?: [string, string];
  /** Percentage the divider snaps to on double-click. */
  snapOnDoubleClick?: number;
  /** Force the still variant regardless of system preference. */
  reducedMotion?: boolean;
  /** Stop the rAF loop while scrolled offscreen or the tab is hidden. */
  pauseWhenHidden?: boolean;
}

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * `prefers-reduced-motion`, read the way React wants an external value read.
 *
 * Upstream kept this in `useState` and re-set it from an effect, alongside a
 * second `hydrated` flag doing the same job — two synchronous `setState` calls
 * inside effects, which is a cascading render each and which this project's
 * lint rejects outright. `useSyncExternalStore` is the same three facts in one
 * hook: what the server should assume (motion is fine — the server cannot know,
 * and assuming otherwise would ship the still variant to everyone), what the
 * client actually sees, and how to hear about a change. Hydration reconciles
 * the two without a mismatch and without a render of its own.
 */
function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    React.useCallback((onChange: () => void) => {
      const mq = window.matchMedia(MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []),
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
}

/** The standard controlled/uncontrolled value pair. */
function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (next: T) => void] {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const current = isControlled ? (value as T) : internal;
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [current, set];
}

const SPRING_K = 140;
const SPRING_C = 18;
/** Intro sweep: 50 → 96 → 4 → 50 over 2.6s, cubic ease per leg. */
const SWEEP_SECONDS = 2.6;
const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;
/** A side's chip fades out once that side narrows past this percentage. */
const LABEL_FADE = 12;
/** How far a finger travels sideways before it counts as a drag, not a scroll. */
const TOUCH_SLOP = 6;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function sweepAt(u: number): number {
  if (u < 0.38) return lerp(50, 96, easeInOutCubic(u / 0.38));
  if (u < 0.78) return lerp(96, 4, easeInOutCubic((u - 0.38) / 0.4));
  return lerp(4, 50, easeInOutCubic((u - 0.78) / 0.22));
}

export function CompareReveal({
  before,
  after,
  defaultPosition = 50,
  position,
  onPositionChange,
  introSweep = true,
  stiffness = SPRING_K,
  damping = SPRING_C,
  labels = ["پیش", "پس"],
  snapOnDoubleClick = 50,
  reducedMotion,
  pauseWhenHidden = true,
  className,
  ...props
}: CompareRevealProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const topRef = React.useRef<HTMLDivElement | null>(null);
  const dividerRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = React.useRef<HTMLButtonElement | null>(null);
  const labelRefs = React.useRef<Array<HTMLElement | null>>([]);
  const paintRef = React.useRef<() => void>(() => {});

  const systemReduced = useReducedMotion();
  const still = reducedMotion === true || systemReduced;

  const onScreen = useVisibilityPause(rootRef, { threshold: 0.2 });
  const animate = !still && (!pauseWhenHidden || onScreen);

  const [pct, setPct] = useControllableState<number>({
    value: position,
    defaultValue: clamp(defaultPosition, 0, 100),
    onChange: (v) => onPositionChange?.(v),
  });

  // Seeded from the RESOLVED initial value so the first imperative paint agrees
  // with the rendered aria-valuenow (a controlled `position` wins).
  const initialPct = clamp(position ?? defaultPosition, 0, 100);
  const sim = React.useRef({
    x: initialPct,
    v: 0,
    target: initialPct,
    dragging: false,
    /** False until a touch has proved itself horizontal. Mice arm instantly. */
    armed: false,
    startX: 0,
    startY: 0,
    pointerId: null as number | null,
    introActive: false,
    introDone: false,
    introStart: 0,
  });

  // Both of these exist so the animation frame can read the newest values
  // without the loop being torn down and restarted whenever one changes. They
  // are seeded from the first render and then kept up to date from effects
  // rather than during render — a ref written mid-render is a value React
  // cannot see, and this project's lint refuses it.
  //
  // Declared above the loop's own effect on purpose: effects on one commit run
  // in source order, so by the time the loop is (re)built, these have landed.
  const params = React.useRef({ stiffness, damping, still, introSweep });
  React.useEffect(() => {
    params.current = { stiffness, damping, still, introSweep };
  }, [stiffness, damping, still, introSweep]);

  /** Latest committed percentage, read by the loop without re-subscribing. */
  const pctRef = React.useRef(pct);
  React.useEffect(() => {
    pctRef.current = pct;
  }, [pct]);

  React.useEffect(() => {
    // Read once, at the top. `sim` holds the same object for the component's
    // whole life — it is a mutable box, not a handle on a rendered node — so
    // the cleanup below closing over `s` is exactly what closing over
    // `sim.current` would have been, and does not make the linter guess.
    const s = sim.current;

    const paint = () => {
      const x = clamp(s.x, 0, 100);
      const top = topRef.current;
      if (top) top.style.clipPath = `inset(0 ${(100 - x).toFixed(3)}% 0 0)`;
      const divider = dividerRef.current;
      if (divider) divider.style.left = `${x.toFixed(3)}%`;
      handleRef.current?.setAttribute("aria-valuenow", String(Math.round(x)));
      const l0 = labelRefs.current[0];
      const l1 = labelRefs.current[1];
      if (l0) l0.style.opacity = x > LABEL_FADE ? "1" : "0";
      if (l1) l1.style.opacity = x < 100 - LABEL_FADE ? "1" : "0";
    };
    paintRef.current = paint;
    paint();

    if (!animate) {
      // There are two reasons not to animate and they want opposite things.
      // Upstream treated them as one and marked the demonstration *done* for
      // both — which silently disabled it here, because on this page the frame
      // mounts behind the entrance curtain and is off-screen at that moment.
      // The sweep armed, the observer reported it hidden, and the sweep was
      // retired before anyone could have seen it.
      if (still) {
        // Reduced motion: there is no demonstration to wait for. Dragging
        // still works — it just maps input 1:1 with no spring.
        s.introDone = true;
        s.introActive = false;
      } else if (s.introActive) {
        // Merely out of sight. Rewind, so it plays in full on the way back.
        s.introActive = false;
        s.introDone = false;
      }
      return;
    }

    if (params.current.introSweep && !s.introDone) {
      s.introActive = true;
      s.introStart = performance.now() / 1000;
    }

    let raf = 0;
    let last = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000));
      last = ts;
      const now = ts / 1000;
      const p = params.current;

      if (s.introActive) {
        const u = (now - s.introStart) / SWEEP_SECONDS;
        if (u >= 1) {
          s.introActive = false;
          s.introDone = true;
          s.target = clamp(pctRef.current, 0, 100);
        } else {
          s.target = sweepAt(u);
        }
      }
      s.v += ((s.target - s.x) * p.stiffness - s.v * p.damping) * dt;
      s.x += s.v * dt;
      if (s.x < 0) {
        s.x = 0;
        s.v = 0;
      }
      if (s.x > 100) {
        s.x = 100;
        s.v = 0;
      }
      paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      if (s.introActive) {
        s.introActive = false;
        s.introDone = false;
        s.target = clamp(pctRef.current, 0, 100);
      }
    };
    // `still` is a dependency even though `animate` already folds it in: the
    // two can be false together, so a visitor who turns reduced motion on while
    // the frame is off-screen would otherwise leave this effect reading a stale
    // reason and holding a sweep it should have retired.
  }, [animate, still]);

  // Every input path commits through state, and the spring target follows state
  // — so a controlled parent that ignores the change keeps the divider put.
  const commit = React.useCallback(
    (next: number) => {
      const s = sim.current;
      s.introActive = false;
      s.introDone = true;
      setPct(clamp(next, 0, 100));
    },
    [setPct],
  );

  React.useEffect(() => {
    const s = sim.current;
    if (s.introActive) return;
    const t = clamp(pct, 0, 100);
    if (Math.abs(s.target - t) < 0.0001) return;
    s.target = t;
    if (params.current.still) {
      s.x = t;
      s.v = 0;
      paintRef.current();
    }
  }, [pct]);

  const positionFromEvent = (clientX: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    commit(((clientX - rect.left) / Math.max(1, rect.width)) * 100);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const s = sim.current;
    s.dragging = true;
    s.pointerId = e.pointerId;
    s.startX = e.clientX;
    s.startY = e.clientY;
    // A mouse click means "put it here". A finger might still mean "scroll".
    s.armed = e.pointerType === "mouse";
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (s.armed) positionFromEvent(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = sim.current;
    if (!s.dragging || e.pointerId !== s.pointerId) return;
    if (!s.armed) {
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (Math.abs(dx) < TOUCH_SLOP || Math.abs(dx) <= Math.abs(dy)) return;
      s.armed = true;
    }
    positionFromEvent(e.clientX);
  };

  const endDrag = () => {
    const s = sim.current;
    s.dragging = false;
    s.armed = false;
    s.pointerId = null;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const base = sim.current.target;
    let next = base;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = base + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = base - step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    else return;
    e.preventDefault();
    commit(next);
  };

  const shown = Math.round(clamp(pct, 0, 100));

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={props["aria-label"] ?? `مقایسه‌ی ${labels[0]} و ${labels[1]}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => commit(snapOnDoubleClick)}
      data-motion={still ? "static" : "animated"}
      className={cn(
        "relative aspect-16/10 w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-bg",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0">{after}</div>
      <div
        ref={topRef}
        className="absolute inset-0 will-change-[clip-path]"
        style={{ clipPath: `inset(0 ${100 - shown}% 0 0)` }}
      >
        {before}
      </div>

      {([labels[0], labels[1]] as const).map((text, i) => (
        <span
          key={text + i}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-4 z-8 rounded-full px-3 py-1.5 transition-opacity duration-300",
            "border border-white/25 bg-black/45 text-[13px] leading-none text-white backdrop-blur-[6px]",
            i === 0 ? "left-4" : "right-4",
          )}
        >
          {text}
        </span>
      ))}

      {/* The rule itself carries no semantics (no role, no text) — it must NOT be
          aria-hidden, because the interactive handle lives inside it. */}
      <div
        ref={dividerRef}
        className="pointer-events-none absolute top-0 bottom-0 z-10 -ml-px w-0.5 bg-white/85 shadow-[0_0_8px_rgba(0,0,0,0.35)] will-change-[left]"
        style={{ left: `${shown}%` }}
      >
        <button
          ref={handleRef}
          type="button"
          role="slider"
          aria-label={`جداکننده‌ی مقایسه، از ${labels[0]} تا ${labels[1]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={shown}
          aria-valuetext={`${shown} درصد ${labels[0]}`}
          onKeyDown={onKeyDown}
          className={cn(
            "pointer-events-auto absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2",
            "cursor-ew-resize place-items-center rounded-full p-0 text-white",
            "border-2 border-white/90 bg-black/35 backdrop-blur-[4px]",
            "shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-shadow duration-[--dur-feedback]",
            "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none",
          )}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            <path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 1 L17 7 L12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default CompareReveal;
