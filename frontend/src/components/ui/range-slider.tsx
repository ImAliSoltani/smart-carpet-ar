"use client";

/**
 * Range slider with a distribution histogram.
 *
 * From [ravikatiyar162/range-slider](https://21st.dev/@ravikatiyar162/components/range-slider),
 * kept whole: the pointer maths, the two-thumb clamping, the keyboard handling
 * and the histogram that colours the bars inside the selected span are the
 * component's own. The histogram is why it was chosen — this catalogue runs
 * from about five million toman to nearly two hundred and fifty, and a bare
 * track over that spread tells a shopper nothing about where the carpets
 * actually are.
 *
 * Edited:
 * - money is formatted by `lib/format`, so it reads in toman and Persian
 *   figures instead of `Intl` dollars.
 * - the track follows the page's direction, so on this RTL page the cheapest
 *   end is on the right. The original is physical throughout —
 *   `clientX - rect.left`, `left: %` — and a first attempt kept it that way by
 *   forcing `dir="ltr"`. That put the minimum thumb on the left while the «از»
 *   box beneath it sat on the right: the control and its own readout ran in
 *   opposite directions. Mirrored properly instead — the thumbs are placed
 *   with `inset-inline-start` and the pointer is measured from the inline
 *   start edge, whichever side that is.
 * - `touch-action: none` on the track. The original listens for `touchmove` on
 *   the document without ever preventing the default, so dragging a thumb on a
 *   phone scrolls the page underneath it.
 * - `aria-valuetext` on both thumbs, or a screen reader announces «۶۷۴۰۰۰۰۰»
 *   rather than a price.
 */

import * as React from "react";

import { formatToman } from "@/lib/format";
import { cn } from "@/lib/utils";

const valueToPercent = (value: number, min: number, max: number) =>
  ((value - min) / (max - min)) * 100;

export interface RangeSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** One bar per bucket, each already normalised to 0…1. */
  data: number[];
  min?: number;
  max?: number;
  step?: number;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  /** Fired once when a drag ends, so a filter is not refetched per pixel. */
  onValueCommit?: (value: [number, number]) => void;
  minLabel?: string;
  maxLabel?: string;
  format?: (value: number) => string;
}

export const RangeSlider = React.forwardRef<HTMLDivElement, RangeSliderProps>(
  (
    {
      className,
      data,
      min = 0,
      max = 100,
      step = 1,
      value: controlled,
      defaultValue = [min, max],
      onValueChange,
      onValueCommit,
      minLabel = "کمترین",
      maxLabel = "بیشترین",
      format = formatToman,
      ...props
    },
    ref,
  ) => {
    const [uncontrolled, setUncontrolled] = React.useState<[number, number]>(defaultValue);
    const values = controlled ?? uncontrolled;
    const [dragging, setDragging] = React.useState<"min" | "max" | null>(null);

    const sliderRef = React.useRef<HTMLDivElement>(null);
    /** How far along the track a pointer is, measured from the inline start. */
    const percentAt = React.useCallback((clientX: number, el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const rtl = getComputedStyle(el).direction === "rtl";
      const from = rtl ? rect.right - clientX : clientX - rect.left;
      return Math.max(0, Math.min(100, (from / rect.width) * 100));
    }, []);
    const latest = React.useRef(values);
    latest.current = values;

    const [minVal, maxVal] = values;
    const minPercent = valueToPercent(minVal, min, max);
    const maxPercent = valueToPercent(maxVal, min, max);

    const change = React.useCallback(
      (next: [number, number]) => {
        setUncontrolled(next);
        onValueChange?.(next);
      },
      [onValueChange],
    );

    React.useEffect(() => {
      if (!dragging) return;

      const onMove = (event: MouseEvent | TouchEvent) => {
        const el = sliderRef.current;
        if (!el) return;
        const clientX = "touches" in event ? event.touches[0]?.clientX : event.clientX;
        if (clientX == null) return;

        const raw = min + (percentAt(clientX, el) / 100) * (max - min);
        const next = Math.round(raw / step) * step;
        const [lo, hi] = latest.current;

        if (dragging === "min") change([Math.min(next, hi - step), hi]);
        else change([lo, Math.max(next, lo + step)]);
      };

      const onUp = () => {
        setDragging(null);
        onValueCommit?.(latest.current);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchend", onUp);

      return () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("touchend", onUp);
      };
    }, [dragging, min, max, step, change, onValueCommit, percentAt]);

    const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, thumb: "min" | "max") => {
      let [lo, hi] = values;

      // Left and right follow what the eye sees, so they swap with the page's
      // direction: on an RTL track the cheap end is on the right and pressing
      // Left has to raise the price. Up and down never swap.
      const rtl =
        typeof window !== "undefined" &&
        sliderRef.current !== null &&
        getComputedStyle(sliderRef.current).direction === "rtl";
      const key =
        rtl && e.key === "ArrowLeft"
          ? "ArrowRight"
          : rtl && e.key === "ArrowRight"
            ? "ArrowLeft"
            : e.key;

      if (key === "ArrowLeft" || key === "ArrowDown") {
        e.preventDefault();
        if (thumb === "min") lo = Math.max(min, lo - step);
        else hi = Math.max(lo + step, hi - step);
      } else if (key === "ArrowRight" || key === "ArrowUp") {
        e.preventDefault();
        if (thumb === "min") lo = Math.min(hi - step, lo + step);
        else hi = Math.min(max, hi + step);
      } else if (key === "Home") {
        e.preventDefault();
        if (thumb === "min") lo = min;
        else hi = lo + step;
      } else if (key === "End") {
        e.preventDefault();
        if (thumb === "min") lo = hi - step;
        else hi = max;
      } else {
        return;
      }

      change([lo, hi]);
      onValueCommit?.([lo, hi]);
    };

    // 44px of target around a 20px disc — the pattern `corner-toggle` settled:
    // §3-5's floor is on the area a thumb has to find, not on the area that
    // gets painted, and a 44px disc on a price track would swallow the
    // histogram behind it. The ring is put on the disc rather than the button
    // so focus still outlines the thing the eye is following.
    const thumb =
      "absolute top-1/2 grid size-11 -translate-y-1/2 cursor-grab place-items-center " +
      "rounded-full active:cursor-grabbing focus-visible:outline-none " +
      "[&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-accent " +
      "[&:focus-visible>span]:ring-offset-2";
    const thumbDot =
      "pointer-events-none block size-5 rounded-full border-2 border-ink bg-paper " +
      "shadow-sm transition-shadow";

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div ref={sliderRef} className="relative h-20 w-full touch-none select-none">
          <div className="absolute inset-0 flex items-end gap-px" aria-hidden="true">
            {data.map((v, i) => {
              const at = (i / Math.max(1, data.length - 1)) * 100;
              const inRange = at >= minPercent && at <= maxPercent;
              return (
                <span
                  key={i}
                  className={cn(
                    "w-full rounded-t-sm transition-colors duration-300",
                    inRange ? "bg-ink/70" : "bg-line-2",
                  )}
                  style={{ height: `${Math.max(2, v * 100)}%` }}
                />
              );
            })}
          </div>

          <div className="relative h-full">
            <button
              type="button"
              role="slider"
              aria-valuemin={min}
              aria-valuemax={maxVal - step}
              aria-valuenow={minVal}
              aria-valuetext={format(minVal)}
              aria-label={minLabel}
              onMouseDown={() => setDragging("min")}
              onTouchStart={() => setDragging("min")}
              onKeyDown={(e) => onKeyDown(e, "min")}
              className={thumb}
              // Logical, so the cheapest end sits at the edge the page starts
              // from; the translate centres it and works either way round.
              style={{ insetInlineStart: `${minPercent}%`, translate: "50% 0" }}
            >
              <span aria-hidden className={thumbDot} />
            </button>
            <button
              type="button"
              role="slider"
              aria-valuemin={minVal + step}
              aria-valuemax={max}
              aria-valuenow={maxVal}
              aria-valuetext={format(maxVal)}
              aria-label={maxLabel}
              onMouseDown={() => setDragging("max")}
              onTouchStart={() => setDragging("max")}
              onKeyDown={(e) => onKeyDown(e, "max")}
              className={thumb}
              style={{ insetInlineStart: `${maxPercent}%`, translate: "50% 0" }}
            >
              <span aria-hidden className={thumbDot} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 items-center gap-3">
          {(
            [
              [minLabel, minVal],
              [maxLabel, maxVal],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-md border border-line bg-paper p-3 text-center">
              <p className="text-[11.5px] text-muted">{label}</p>
              <p className="mt-1 text-[15px] font-semibold tracking-tight">{format(v)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

RangeSlider.displayName = "RangeSlider";
