"use client";

import * as React from "react";

import { IntroEngine } from "./intro-engine";
import { markIntroSeen } from "./intro-gate";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The cinematic entrance (ROADMAP §3, last item of phase 3).
 *
 * The film and its rules live in `intro-engine.ts`; this is the part React is
 * actually good at — the chrome around it, and the way out.
 *
 * **The way out is the point of this file.** The chaptered pattern was chosen
 * knowing it takes the scroll away from the visitor, and the roadmap logged
 * that as debt 4: a curtain you cannot dismiss is a trap. The prototype had
 * arrow keys and nothing else — no roles, no labels, no focus handling, no
 * Escape. So:
 *
 * - It is a `dialog`, modal, labelled, and it says what it is.
 * - Focus moves to «رد شدن» on mount, which makes the first Tab stop the exit
 *   rather than something behind the curtain.
 * - Focus is kept inside while it runs, and handed back to the document when it
 *   ends — otherwise a keyboard visitor lands back at the top of a page they
 *   have already scrolled past.
 * - Escape leaves, at any point, without waiting for the film.
 * - Every chapter is announced politely, because a canvas says nothing.
 * - The canvas is `aria-hidden`: it is the decoration, not the content.
 *
 * `prefers-reduced-motion` never reaches here — the gate collapses to a still
 * before this mounts.
 */

const SCENE_LABELS = [
  "دار قالی در تاریکی",
  "دست‌های بافنده",
  "فرش نیمه‌بافته",
  "نمای درشت از گره‌ها",
  "فرش کامل زیر نور",
];

export function IntroSequence({ onDone }: { onDone: () => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const skipRef = React.useRef<HTMLButtonElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const engineRef = React.useRef<IntroEngine | null>(null);

  const [cue, setCue] = React.useState("در حال آماده‌سازی");
  const [chapter, setChapter] = React.useState(0);
  const [total, setTotal] = React.useState(4);
  const [titleShown, setTitleShown] = React.useState(false);

  // `onDone` is read by the engine's callbacks, which are built once. Keeping it
  // in a ref means a parent that re-renders with a new closure does not tear the
  // engine down and restart the film.
  const doneRef = React.useRef(onDone);
  React.useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let finished = false;
    const engine = new IntroEngine(canvas, {
      onCue: setCue,
      onChapter: (c, t) => {
        setChapter(c);
        setTotal(t);
      },
      onTitle: setTitleShown,
      onFinish: () => {
        if (finished) return;
        finished = true;
        markIntroSeen();
        doneRef.current();
      },
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    const force = params.get("force");
    void engine.boot(force === "play" || force === "static" ? force : null);

    const onResize = () => engine.fit();
    window.addEventListener("resize", onResize);

    // One flick of a wheel or trackpad is one gesture. Trackpads emit a stream
    // of small deltas, so they are accumulated to a threshold and the rest of
    // that same flick is ignored until the stream goes quiet.
    const WHEEL_THRESHOLD = 28;
    const FLICK_GAP = 220;
    let wheelAccum = 0;
    let lastWheelAt = 0;
    let flickSpent = false;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelAt > FLICK_GAP) {
        wheelAccum = 0;
        flickSpent = false;
      }
      lastWheelAt = now;
      if (flickSpent) return;
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;
      const dir = Math.sign(wheelAccum);
      wheelAccum = 0;
      flickSpent = true;
      engine.gesture(dir);
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => e.preventDefault();
    const onTouchEnd = (e: TouchEvent) => {
      const end = e.changedTouches[0] ? e.changedTouches[0].clientY : touchY;
      const dy = touchY - end;
      if (Math.abs(dy) > 35) engine.gesture(dy > 0 ? 1 : -1);
    };

    const onKey = (e: KeyboardEvent) => {
      // Escape leaves. It is the one key everybody already knows means «let me
      // out», and without it the only exit is a button you must first find.
      if (e.key === "Escape") {
        e.preventDefault();
        engine.finish();
        return;
      }
      // Tab is left alone so focus can still move; everything inside is
      // reachable and there is nothing behind to reach.
      if (e.key === "Tab") return;

      // Enter and Space belong to the focused button — they press it. This
      // exemption is *only* for those two keys, and that distinction is the
      // whole bug it replaced: the exit takes focus on mount by design, and
      // exempting every stepping key while it held focus meant the arrows did
      // nothing at all until the visitor tabbed away. A keyboard route that
      // starts by being disabled is not a keyboard route.
      const onExit = document.activeElement === skipRef.current;
      if (onExit && (e.key === " " || e.key === "Enter")) return;

      if (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        engine.gesture(1);
        return;
      }
      if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        engine.gesture(-1);
      }
    };

    // Focus must not escape behind the curtain while the curtain is up.
    const onFocusIn = (e: FocusEvent) => {
      const frame = frameRef.current;
      if (frame && e.target instanceof Node && !frame.contains(e.target)) {
        skipRef.current?.focus();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);

    // The exit is the first thing focus lands on, deliberately.
    skipRef.current?.focus();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const scene = Math.min(chapter, SCENE_LABELS.length - 1);

  return (
    <div
      ref={frameRef}
      role="dialog"
      aria-modal="true"
      aria-label="مقدمه‌ی تصویری: بافته شدن فرش"
      className="fixed inset-0 z-[100] overflow-hidden bg-[#07060a]"
    >
      <canvas ref={canvasRef} aria-hidden className="block size-full" />

      {/* A vignette, so the type at the edges has something to sit on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 40%, rgba(7,6,10,.72) 100%)",
        }}
      />

      {/* What a canvas cannot say. Chapters are announced as they land; the
          region is polite so it never interrupts mid-sentence. */}
      <p role="status" aria-live="polite" className="sr-only">
        {`صحنه‌ی ${formatNumber(scene + 1)} از ${formatNumber(SCENE_LABELS.length)}: ${SCENE_LABELS[scene]}`}
      </p>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center",
          "transition-opacity duration-700 ease-[cubic-bezier(.16,1,.3,1)]",
          titleShown ? "opacity-100" : "opacity-0",
        )}
      >
        <p className="font-display text-[clamp(2.5rem,9vw,5rem)] leading-none text-[#faf9f7]">
          ترنجان
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-[#faf9f7]/75">
          فرش را پیش از خرید، در خانه‌ی خودتان ببینید
        </p>
      </div>

      {/* The prompt. Never «scroll» alone — the keyboard and a thumb are just as
          valid here, and naming only the wheel tells the other two they are
          not invited. */}
      <p
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-24 px-6 text-center text-[13px] tracking-wide text-[#faf9f7]/70",
          "transition-opacity duration-500",
          cue ? "opacity-100" : "opacity-0",
        )}
      >
        {cue}
      </p>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-16 flex items-center justify-center gap-2"
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-px w-8 transition-colors duration-500",
              i < chapter ? "bg-[#faf9f7]/80" : "bg-[#faf9f7]/25",
            )}
          />
        ))}
      </div>

      <button
        ref={skipRef}
        type="button"
        onClick={() => engineRef.current?.finish()}
        className={cn(
          "absolute end-5 top-5 grid h-11 items-center rounded-full border px-5",
          "border-[#faf9f7]/35 text-[13px] text-[#faf9f7]/85",
          "transition-colors duration-[--dur-feedback]",
          "hover:border-[#faf9f7]/80 hover:text-[#faf9f7]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#faf9f7]",
        )}
      >
        رد شدن و ورود به فروشگاه
      </button>

      {/* Said once, for a reader who cannot see the button sitting in the
          corner. Not `sr-only` on the button itself — it needs its visible
          label too. */}
      <p className="sr-only">
        این مقدمه اختیاری است. برای رد شدن، کلید Escape را بزنید یا دکمه‌ی «رد شدن
        و ورود به فروشگاه» را انتخاب کنید. برای جلو بردن صحنه‌ها از کلیدهای جهت
        استفاده کنید.
      </p>
    </div>
  );
}
