"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type Transition,
} from "framer-motion";

import { formatNumber, formatToman } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The panel's motion vocabulary, in one place.
 *
 * Two classes, per §3-5 of the roadmap, and nothing in between: state feedback
 * is 150–300ms, entrances and transitions are 400–900ms. A panel that borrows
 * the shop's slowness wholesale feels sluggish to someone working in it all
 * day, so the entrances here sit at the fast end of that band while the shop
 * uses the slow end.
 *
 * `prefers-reduced-motion` is honoured by every export. It has to be honoured
 * *here* rather than in the stylesheet: framer writes transforms as inline
 * style through JavaScript, and a CSS rule zeroing durations never reaches it.
 */

/** The shop's curve — a fast start that settles rather than arriving. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const ENTER: Transition = { duration: 0.5, ease: EASE_OUT };
export const FEEDBACK: Transition = { duration: 0.22, ease: EASE_OUT };

/** Per the motion guidance: 20–40ms between items, and a cap so the last one
 *  never looks like it is waiting its turn. */
export const STAGGER_STEP = 0.045;
export const STAGGER_CAP = 0.36;

export function staggerDelay(index: number): number {
  return Math.min(index * STAGGER_STEP, STAGGER_CAP);
}

/**
 * The same idea, but told how long the list is.
 *
 * A fixed step cannot serve both a row of four counters and a table of two
 * hundred orders. Short lists want a step you can *see* — the rows arriving one
 * after another is the point, and at 45ms with a 0.36s cap the last few landed
 * together, which reads as a block appearing late rather than a list filling
 * in. Long lists want the opposite: the guidance caps per-item delay at 40ms
 * for anything past ten items, because total reveal time is what turns into
 * waiting.
 *
 * So the step comes from the count, and the cap is what stops a long list from
 * taking longer to arrive than it took to fetch.
 */
export function listStagger(index: number, total: number): number {
  const step = total <= 12 ? 0.065 : 0.028;
  return Math.min(index * step, 0.62);
}

/**
 * A block that rises into place.
 *
 * `initial` branches on the preference, which the storefront's card does too:
 * everything in the panel renders after the session query settles, so there is
 * no server-rendered markup for the branch to disagree with. Without the
 * branch, a visitor who asked for less motion is handed a page of invisible
 * elements — the fade never runs, and nothing removes the `opacity: 0`.
 */
export function Rise({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...ENTER, delay: reduced ? 0 : staggerDelay(index) }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A hairline that draws itself across the top of a card.
 *
 * The one place gold is allowed to be a *line* rather than a dot: §4 keeps the
 * accent to small marks so it stays a detail, and a rule one pixel tall is
 * still a detail. It is what makes a plain card read as finished.
 *
 * Inset from the edges rather than clipped by them. Clipping means
 * `overflow: hidden` on the card, and a card that clips is a scrollport — which
 * silently disables `position: sticky` for everything inside it. That cost the
 * carpet form its pinned save bar once, and the rail its pinned footer.
 */
export function GoldRule({ delay = 0 }: { delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className="absolute inset-x-4 top-0 h-px origin-right bg-gradient-to-l from-accent/70 via-accent/25 to-transparent"
      initial={reduced ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: reduced ? 0 : 0.8, ease: EASE_OUT, delay: reduced ? 0 : delay }}
    />
  );
}

/**
 * A figure that counts up to itself, in Persian digits.
 *
 * Hand-rolled rather than `NumberFlow`, and for a recorded reason: that library
 * splits a formatted string into per-digit columns of 0–9, and Persian figures
 * are not in that column — the cart page got `NaN` out of it. Here the *number*
 * is animated and `formatNumber` runs on each frame, so the digits are only
 * ever produced by the formatter that knows how to make them.
 *
 * Long figures are skipped: watching ۶۷٬۴۰۰٬۰۰۰ spin is a slot machine, not a
 * dashboard. Counting is for the small counts, where the movement reads as the
 * number arriving.
 */
const COUNT_UP_CEILING = 10_000;

export function CountUp({
  value,
  money = false,
  className,
}: {
  value: number | string;
  money?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const target = typeof value === "number" ? value : Number(value);
  const format = money ? formatToman : formatNumber;

  const counts = Number.isFinite(target) && !reduced && target <= COUNT_UP_CEILING;

  // A motion value rather than a ref, because it carries its own current
  // reading: a refetch that lands mid-count resumes from where the eye is
  // instead of snapping back to zero. A ref would do the same, but writing one
  // during render is exactly the thing that makes concurrent React tear.
  const progress = useMotionValue(0);
  const [counted, setCounted] = React.useState(0);
  useMotionValueEvent(progress, "change", (value) => setCounted(Math.round(value)));

  React.useEffect(() => {
    if (!counts) return;
    const controls = animate(progress, target, { duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [target, counts, progress]);

  // Derived rather than stored: when the figure is not being counted — reduced
  // motion, or a number too long to be worth watching — it is simply itself,
  // and no effect has to write it into state to keep it current.
  const shown = counts ? counted : target;

  // Never `font-figure`: that face is subset to latin digits and a Persian
  // numeral sent through it falls back to whatever the system has.
  //
  // **And never `tabular-nums`, which is what this counter used to carry.**
  // It was here to stop the width jittering as the digits changed, and it did
  // — by pushing the digits apart. Reported as «۴۱۱ از ۴۱۱ has a gap between
  // the first digits», and measured in the browser at 16px in Vazirmatn:
  //
  //     ۴۱۱   proportional 18.4px → tabular 31.6px
  //     411   proportional 27.0px → tabular 27.0px
  //
  // The Latin figures do not move because Vazirmatn's Latin digits are already
  // tabular; asking for the feature only ever pads the Persian ones, by about
  // 4.4px per glyph at 16px. So the gap was not a spacing bug beside the
  // figure, it was inside it — and beside a plain `formatNumber` that had no
  // such padding, the two halves of one sentence stopped matching.
  //
  // Nothing replaces it, because nothing needs to: three of the four counters
  // are the whole line, and text that is alone in its box can change width
  // without anything appearing to move. The fourth used to be «count از total»
  // on one line and is now a figure with its total in the hint, like the sales
  // card beside it.

  // The unit is set apart rather than run into the figure. Two reasons, and the
  // second is the one that showed: «۱٬۸۹۹٬۰۰۰ تومان» at 26px wrapped onto a
  // second line and made its card taller than the three beside it, breaking a
  // row that only works when the four read as one. Quietening the unit also
  // leaves the figure to carry the card, which is what a counter is for.
  if (money) {
    return (
      <span className={cn("whitespace-nowrap", className)}>
        <span>{formatNumber(shown)}</span>
        <span className="ms-1.5 text-[0.55em] font-normal text-muted">تومان</span>
      </span>
    );
  }

  return <span className={cn("whitespace-nowrap", className)}>{format(shown)}</span>;
}
