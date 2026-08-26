"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { formatNumber } from "@/lib/format";
import { useVisibilityPause } from "@/lib/use-visibility-pause";
import { cn } from "@/lib/utils";

/**
 * An editorial carousel: one item at a time, told rather than listed.
 *
 * Adapted from [dev.yadhakim/elegant-carousel](https://21st.dev/@dev.yadhakim/components/elegant-carousel).
 * The registry's answer carried the markup and the timing but imported its
 * `carousel-*` classes from an `index.css` that was not part of the answer, so
 * every rule here is written rather than restyled — which is what it would have
 * become anyway: the original is a fashion lookbook in inline hex, and this is
 * a carpet shop with its own tokens and its own direction.
 *
 * **What changed beyond the paint:**
 *
 * - *An auto-advancing carousel needs a stop, and hover is not one.* Upstream
 *   paused on hover and nothing else, which serves a mouse and abandons
 *   everyone else — a keyboard visitor could not stop it, and a phone has no
 *   hover at all. There is now a real pause control, it also holds for a
 *   keyboard caret inside the section, and `prefers-reduced-motion` turns
 *   autoplay and the slow zoom off entirely. The hover pause is gone: see
 *   `advancingOnItsOwn`.
 * - *It says what it is.* The frame is a labelled carousel, each slide says
 *   which of how many it is, and the running commentary is kept out of the
 *   screen reader while it advances on its own — an announcement every seven
 *   seconds that the visitor did not ask for is noise, not information.
 * - *Direction.* Swipe and arrows follow the page, not the viewport: under
 *   `dir="rtl"` the «next» arrow points right, and a leftward swipe advances.
 *
 * The slide itself is a link. A showcase whose pictures cannot be opened is an
 * advertisement, and this one is standing in front of a shop.
 *
 * **Three things the first version got wrong, and what they had in common.**
 * The turn was one commit — fade and swap together — so the carpet that flashed
 * for a moment before the motion was the *arriving* one. The autoplay loop
 * ended itself at the turn and left the turn to restart it, which is a carousel
 * with one way to stop and no way back. And the hover pause stopped it for
 * anyone whose pointer was resting on it and for every phone, which sends a
 * `mouseenter` on a tap and no leave after it. Each was the same mistake: a
 * piece of the machine that could only be wound by the piece it had just handed
 * off to — and in the third case, by the visitor going away.
 *
 * **A fourth, found while looking for a fifth.** «چرا فقط بعد از لمس شروع
 * می‌کند؟» could not be reproduced in an emulated phone — but the search turned
 * up a carousel that had been counting its seven seconds since the moment it
 * mounted, which on the front page is behind the entrance film and far below
 * the fold. Whatever the phone was doing, this is the same complaint from the
 * other end: arrive at a carousel mid-interval and it looks like one that is
 * not moving. It now counts only while it is on the visitor's screen.
 */

export interface CarouselSlide {
  id: string | number;
  /** The headline of the slide — for a carpet, its name. */
  title: string;
  /** A short qualifier under the title: origin, weave, material. */
  subtitle: string;
  /**
   * What the bottom bar calls this slide where there is no room for the
   * subtitle. A quarter of a phone is about seven characters wide.
   */
  shortLabel?: string;
  /** The prose. Two or three sentences is the shape this layout wants. */
  description: string;
  /** A colour taken from the item itself, used to tint the frame. */
  accent: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
}

export interface ElegantCarouselProps {
  slides: CarouselSlide[];
  /** Where the slide's link goes, as words. */
  ctaLabel?: string;
  /** How long each slide holds, in ms. */
  interval?: number;
  className?: string;
  /** Accessible name for the whole carousel. */
  label: string;
  /** Visible section heading. Rendered as the `h2` the slides' `h3` sits under. */
  heading?: string;
  note?: string;
}

const TRANSITION_MS = 620;
/** Half of it. The slide that is leaving gets this; the one arriving gets the rest. */
const FADE_MS = TRANSITION_MS / 2;

function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    React.useCallback((onChange: () => void) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []),
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function ElegantCarousel({
  slides,
  ctaLabel = "دیدن این فرش",
  interval = 7000,
  className,
  label,
  heading,
  note,
}: Readonly<ElegantCarouselProps>) {
  const reduced = useReducedMotion();

  const [index, setIndex] = React.useState(0);
  /** The slide being turned to, held while the one on screen fades out. */
  const [pending, setPending] = React.useState<number | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  const rootRef = React.useRef<HTMLElement>(null);
  const indexRef = React.useRef(0);
  const pendingRef = React.useRef<number | null>(null);
  /** 0–100 for the current slide's bar. Deliberately not state — see `setBar`. */
  const progressRef = React.useRef(0);
  const touchStart = React.useRef<number | null>(null);

  const count = slides.length;
  // Autoplay stops for a stated preference, for the button that says so, for a
  // keyboard visitor reading with the caret inside it, and for a carousel of
  // one. It does **not** stop for a pointer resting on it.
  //
  // It used to, because that is what the registry's answer did and what half
  // the carousels on the web do. What that means in practice was reported as
  // «وقتی داره ویترین رو می‌بینه pause میشه، وقتی scroll می‌کنه پایین‌تر نرمال
  // حرکت می‌کنه»: the shop's own showcase held still for exactly the visitor
  // who was looking at it, and ran for the one who had already gone past. The
  // pointer is not a request. The pause button is, and it is right there.
  const timed = !reduced && count > 1;
  const autoplay = timed && !paused;
  const advancingOnItsOwn = autoplay && !focused;

  /**
   * And it does not run where nobody can see it.
   *
   * The timer used to start at mount, which on the front page is behind the
   * entrance film and two screens below the fold. So the showcase spent its
   * first turns on an empty room, and the visitor who finally scrolled down
   * arrived somewhere in the middle of an interval — three seconds of a still
   * picture, then a turn, or none at all before they gave up and touched it.
   * The seven seconds are meant to be seven seconds of *somebody looking*.
   *
   * It is also the honest reading of the timer: a carousel is a thing that
   * turns for a reader, and when there is no reader there is nothing to turn.
   */
  const onScreen = useVisibilityPause(rootRef, { threshold: 0.2 });

  // It also stands still *through* a turn, so the bar does not start refilling
  // behind a slide that is still leaving.
  const playing = advancingOnItsOwn && onScreen && pending === null;
  const fading = pending !== null;

  /**
   * The bar's fill, written straight to the DOM as a custom property.
   *
   * It was state, and state at 60fps is a re-render of the whole carousel —
   * photograph, prose and all — sixty times a second for a line two pixels
   * tall. Writing the property leaves React out of that loop, and it is why the
   * value is not in the `style` prop: React rewrites the properties it knows
   * about on every commit, and would put the last render's number back.
   */
  const setBar = React.useCallback((pct: number) => {
    rootRef.current?.style.setProperty("--slide-progress", `${pct}%`);
  }, []);

  React.useEffect(() => {
    indexRef.current = index;
  }, [index]);

  React.useEffect(() => {
    if (onScreen) return;
    // Gone off screen: the bar rewinds, so the next arrival gets a whole
    // interval rather than the tail of one that ran behind their back. This is
    // the one place a rewind is right — everywhere else a pause holds the bar
    // where it stood, because there the visitor is still there.
    progressRef.current = 0;
    setBar(0);
  }, [onScreen, setBar]);

  const goTo = React.useCallback(
    (next: number) => {
      // One turn at a time: a second request mid-fade would swap the carpet
      // underneath a picture that has not finished leaving.
      if (pendingRef.current !== null) return;
      const target = ((next % count) + count) % count;
      if (target === indexRef.current) return;
      // The ref is set here and not in the effect below because the guard above
      // has to see it within the same tick — two arrow presses in one frame are
      // two calls before React has rendered either.
      pendingRef.current = target;
      setPending(target);
    },
    [count],
  );

  const goNext = React.useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const goPrev = React.useCallback(() => goTo(indexRef.current - 1), [goTo]);

  /**
   * The turn itself, half a transition after it was asked for: out, then swap,
   * then in.
   *
   * Both halves used to land in one commit — the fade began and the index moved
   * in the same update — so the *arriving* carpet was painted at full opacity,
   * faded out, and faded back in. The first thing the eye caught was the next
   * slide, before any of the motion had run.
   */
  React.useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => {
      progressRef.current = 0;
      setBar(0);
      pendingRef.current = null;
      setPending(null);
      setIndex(pending);
    }, FADE_MS);
    // Upstream left this timer to expire on its own. A carousel unmounted
    // mid-turn then set state on a component that no longer exists.
    return () => window.clearTimeout(timer);
  }, [pending, setBar]);

  // One loop drives both the bar and the turn, so the bar can never finish
  // early or run on past the change — upstream ran two intervals side by side
  // and let them drift apart.
  React.useEffect(() => {
    if (!playing) return;
    let raf = 0;
    // Resumed where it was left rather than started from zero: a pointer that
    // crosses the section and leaves should cost the slide the moment it was
    // held, not the time it had already served.
    let started = performance.now() - (progressRef.current / 100) * interval;
    const tick = (now: number) => {
      const elapsed = now - started;
      if (elapsed >= interval) {
        progressRef.current = 100;
        setBar(100);
        goNext();
        // Deliberately not a `return`. Ending the loop here made the turn the
        // only thing that could ever start it again — so a turn that did not
        // happen, for any reason at all, was a carousel that never moved and a
        // bar that stood full for good.
        started = now;
      } else {
        progressRef.current = (elapsed / interval) * 100;
        setBar(progressRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, interval, index, goNext, setBar]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Physical arrows, logical meaning: under `dir="rtl"` the visitor's «next»
    // is the left arrow, because that is the direction the page moves in.
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (rtl) goNext();
      else goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (rtl) goPrev();
      else goNext();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touchStart.current;
    touchStart.current = null;
    if (from == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? from) - from;
    if (Math.abs(dx) < 48) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    // Dragging the content towards the start of the line advances it.
    const forward = rtl ? dx > 0 : dx < 0;
    if (forward) goNext();
    else goPrev();
  };

  if (count === 0) return null;
  const slide = slides[index];

  return (
    <section
      ref={rootRef}
      className={cn("relative isolate overflow-hidden bg-bg", className)}
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      // Keyboard focus, not any focus. Clicking «بعدی» focuses the button it
      // clicked, and a carousel that stops permanently because someone once
      // pressed next is the same bug wearing different clothes. `:focus-visible`
      // is the browser's own answer to «did they arrive here by keyboard».
      onFocus={(e) => {
        if (e.target instanceof Element && e.target.matches(":focus-visible")) {
          setFocused(true);
        }
      }}
      onBlur={() => setFocused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* The frame borrows the carpet's own colour, faintly. `color-mix` keeps
          it a wash rather than a tint over the photograph — the picture has to
          stay the truest thing on screen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-[900ms]"
        style={{
          // 9%, not more. A turquoise Qom silk will happily paint the whole
          // section cyan at 14%, and the brief is explicit that the interface
          // sits back so the carpet is the loudest thing on the page.
          background: `radial-gradient(ellipse at 20% 45%, color-mix(in oklab, ${slide.accent} 9%, transparent) 0%, transparent 72%)`,
        }}
      />

      {heading && (
        <div className="mx-auto w-full max-w-7xl px-5 pt-14 sm:px-8">
          <h2 className="border-t border-line pt-8 text-xl font-bold tracking-tight sm:text-2xl">
            {heading}
          </h2>
          {note && <p className="mt-2 text-[13px] text-muted">{note}</p>}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-16">
        {/* Text first in the DOM: under `dir="rtl"` the first column is the
            right-hand one, which is where reading starts. */}
        <div
          // `aria-live` stays off while it turns by itself. It becomes polite
          // only when the visitor has taken the wheel, which is the one time an
          // announcement answers a question they actually asked. It reads
          // `advancingOnItsOwn` rather than `playing` on purpose: `playing` also
          // goes false for the third of a second a turn takes, and a region that
          // becomes live in the middle of one announces the automatic turns this
          // is here to keep quiet.
          aria-live={advancingOnItsOwn ? "off" : "polite"}
          aria-atomic="true"
          className={cn(
            "transition-opacity ease-out",
            fading ? "opacity-0" : "opacity-100",
          )}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        >
          {/* Persian digits, because every other number in this shop is — a
              Latin counter here would be the only «03» on a page of «۰۳».
              `ltr-isolate` all the same: the pair is read left-to-right around
              its slash, and without the isolation bidi swaps the two numbers
              and the counter appears to count backwards. */}
          <p className="ltr-isolate text-[12px] text-muted tabular-nums">
            {formatNumber(index + 1)} / {formatNumber(count)}
          </p>

          <h3 className="mt-4 text-2xl leading-[1.45] font-bold tracking-tight text-balance text-ink sm:text-3xl">
            {slide.title}
          </h3>

          <p className="mt-3 text-[15px]" style={{ color: `color-mix(in oklab, ${slide.accent} 70%, var(--ink-2))` }}>
            {slide.subtitle}
          </p>

          <p className="mt-5 max-w-prose text-[15px] leading-loose text-muted">
            {slide.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={slide.href}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-cta px-7 text-[15px] text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {ctaLabel}
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </Link>

            {count > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="اسلاید قبلی"
                  className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <ChevronRight className="size-5" />
                </button>
                {!reduced && (
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? "ادامه‌ی نمایش خودکار" : "توقف نمایش خودکار"}
                    aria-pressed={paused}
                    className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  >
                    {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="اسلاید بعدی"
                  className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                >
                  <ChevronLeft className="size-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          // Text leads in the DOM — a screen reader should hear which carpet
          // this is before it is told there is a photograph of it. Stacked on a
          // phone the eye wants the opposite, so the picture is moved above by
          // `order` alone, which leaves the reading order untouched. On the
          // wide layout the two columns sit side by side and neither is first.
          className="relative order-first lg:order-none"
          aria-roledescription="اسلاید"
          aria-label={`${formatNumber(index + 1)} از ${formatNumber(count)}`}
        >
          <div
            className={cn(
              // Capped on the wide layout: a portrait panel at half a desktop
              // window is 770px tall, which is more than the screen and turns a
              // showcase into a scroll. The cap crops the picture a little
              // further instead, which a carpet photographed flat can afford.
              "relative aspect-4/5 w-full overflow-hidden rounded-2xl bg-paper shadow-raised transition-opacity ease-out sm:aspect-3/4 lg:aspect-4/5 lg:max-h-[600px]",
              fading ? "opacity-0" : "opacity-100",
            )}
            style={{ transitionDuration: `${FADE_MS}ms` }}
          >
            <Image
              // Keyed by slide, so React swaps the element instead of mutating
              // one `<img>` — without it the browser keeps the old bitmap up
              // while the new file decodes and the fade shows the wrong carpet.
              key={slide.id}
              src={slide.imageUrl}
              alt={slide.imageAlt}
              fill
              sizes="(min-width: 1024px) 46vw, 92vw"
              className={cn(
                "object-cover",
                // Ken Burns, but only for those who want motion. It is a slow
                // push on a still photograph, and it is the first thing to go.
                !reduced && "animate-[toranjan-kenburns_14s_ease-out_forwards]",
              )}
            />
          </div>

          {/* The corner rules, in the carpet's colour. Decoration, and named as
              such so it is never read aloud. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-2 -left-2 size-10 rounded-tl-2xl border-t-2 border-l-2"
            style={{ borderColor: `color-mix(in oklab, ${slide.accent} 55%, transparent)` }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 -bottom-2 size-10 rounded-br-2xl border-r-2 border-b-2"
            style={{ borderColor: `color-mix(in oklab, ${slide.accent} 55%, transparent)` }}
          />
        </div>
      </div>

      {count > 1 && (
        <div className="mx-auto flex max-w-7xl gap-2 px-5 pb-12 sm:px-8 lg:pb-16">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`رفتن به ${s.title}`}
              aria-current={i === index}
              // `min-w-0` is the whole fix for a bar that ran off the phone.
              // A flex item's automatic minimum is its content, and the label
              // below is `nowrap`, so `flex-1` could not shrink these four
              // buttons past «قم · ابریشم · لچک‌ترنج» — the row was 443px wide
              // inside 375, the fourth button started 68px off the near edge,
              // and the section's `overflow-hidden` cut it there. `truncate`
              // never got a say, because nothing was ever too narrow for it.
              className="group min-w-0 flex-1 py-3 focus-visible:outline-none"
            >
              <span className="block h-0.5 w-full overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full transition-[width] duration-100 ease-linear group-focus-visible:bg-accent"
                  style={{
                    width:
                      i === index
                        ? // The running value, or a plain «you are here» marker
                          // where there is no timer to report.
                          timed
                          ? "var(--slide-progress, 0%)"
                          : "100%"
                        : i < index
                          ? "100%"
                          : "0%",
                    backgroundColor: i === index ? slide.accent : "var(--line-2)",
                  }}
                />
              </span>
              <span className="mt-2 block truncate text-start text-[12px] text-muted transition-colors duration-[--dur-feedback] group-hover:text-ink-2">
                {/* Even truncated, three facts in 78px is «قم · ابری…». The
                    short label is one of them whole. */}
                <span className="sm:hidden">{s.shortLabel ?? s.subtitle}</span>
                <span className="hidden sm:inline">{s.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default ElegantCarousel;
