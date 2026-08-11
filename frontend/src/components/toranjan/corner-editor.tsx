"use client";

import * as React from "react";
import Image from "next/image";

import type { CornerPoint } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Four draggable handles over a photograph (ROADMAP §6-16).
 *
 * The API hands back corners in pixels of the *original* photograph — 2400×1600
 * for a typical one — while the screen shows that photograph at whatever width
 * is left over. Every hard thing here is that one gap.
 *
 * **Nothing keeps a scale factor.** A stored factor is a second copy of the
 * truth that goes stale on a resize, a font swap, or a sidebar animating open,
 * and a stale one puts the handle where nobody pressed. Instead:
 *
 * - *Drawing* uses percentages. `x / imageWidth` is where the handle sits, and
 *   because the frame is the image box the two aspect ratios are the same
 *   number — so the browser does the conversion, continuously, for free.
 * - *Reading a pointer* measures the frame at the moment of the move with
 *   `getBoundingClientRect()`. The one place a factor is needed is the one
 *   place it cannot be out of date.
 *
 * **`clientX` and `rect.left` are both physical**, so the arithmetic is
 * unaffected by the page being right-to-left. That is also why the handles are
 * placed with a literal `transform` rather than a utility: `translate` is
 * physical and does not mirror, which is a trap everywhere else in this project
 * and is exactly what is wanted here.
 *
 * **Arrow keys are not mirrored, and that is deliberate.** The filter panel had
 * to swap left and right because its slider mirrors: its minimum sits on the
 * right in a right-to-left page. A photograph does not mirror. The corner at
 * `x = 0` is at the visual left edge for every reader, so ArrowLeft moves the
 * handle left and decreases `x`. Flipping it here — which the plan for this
 * screen expected — would mean pressing left and watching the handle go right.
 *
 * One `PointerEvent` path serves mouse, touch and pen; `setPointerCapture`
 * keeps the drag alive when the pointer leaves the handle, which is most of a
 * drag. `touch-action: none` is what stops a touch drag scrolling the page
 * instead of moving the corner.
 */

/** The order the backend reads them in, and the label for each. */
const CORNER_LABELS = ["بالا چپ", "بالا راست", "پایین راست", "پایین چپ"] as const;

export interface CornerEditorProps {
  src: string;
  /** Natural size of the source photograph, from `GET …/ar/corners`. */
  imageWidth: number;
  imageHeight: number;
  corners: CornerPoint[];
  onChange: (corners: CornerPoint[]) => void;
  /** While the pipeline runs, the corners that produced it must hold still. */
  disabled?: boolean;
  className?: string;
}

export function CornerEditor({
  src,
  imageWidth,
  imageHeight,
  corners,
  onChange,
  disabled = false,
  className,
}: CornerEditorProps) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  const clamp = React.useCallback(
    (point: CornerPoint): CornerPoint => ({
      // The schema requires `ge=0`, and a corner outside the photograph has no
      // pixels to sample anyway.
      x: Math.min(Math.max(point.x, 0), imageWidth),
      y: Math.min(Math.max(point.y, 0), imageHeight),
    }),
    [imageWidth, imageHeight],
  );

  const replace = React.useCallback(
    (index: number, point: CornerPoint) => {
      onChange(corners.map((corner, i) => (i === index ? clamp(point) : corner)));
    },
    [corners, clamp, onChange],
  );

  const moveToPointer = React.useCallback(
    (index: number, clientX: number, clientY: number) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      // A frame with no size means the image has not laid out yet; dividing by
      // it would write `Infinity` into a corner.
      if (rect.width === 0 || rect.height === 0) return;
      replace(index, {
        x: ((clientX - rect.left) / rect.width) * imageWidth,
        y: ((clientY - rect.top) / rect.height) * imageHeight,
      });
    },
    [replace, imageWidth, imageHeight],
  );

  // A step in *source* pixels, sized from the photograph rather than fixed. One
  // pixel of a 2400px original is a quarter of a screen pixel — a key press
  // that visibly does nothing. A fraction of the width behaves the same way on
  // every photograph the shop uploads.
  const step = React.useCallback(
    (coarse: boolean, axis: "x" | "y") => {
      const extent = axis === "x" ? imageWidth : imageHeight;
      return Math.max(1, Math.round(extent * (coarse ? 0.02 : 0.0025)));
    },
    [imageWidth, imageHeight],
  );

  const announce = React.useCallback(
    (index: number, point: CornerPoint) => {
      const x = Math.round((point.x / imageWidth) * 100);
      const y = Math.round((point.y / imageHeight) * 100);
      setAnnouncement(
        `گوشه‌ی ${CORNER_LABELS[index]}: ${formatNumber(x)}٪ از چپ، ${formatNumber(y)}٪ از بالا`,
      );
    },
    [imageWidth, imageHeight],
  );

  const onKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const coarse = event.shiftKey;
    let dx = 0;
    let dy = 0;
    switch (event.key) {
      case "ArrowLeft":
        dx = -step(coarse, "x");
        break;
      case "ArrowRight":
        dx = step(coarse, "x");
        break;
      case "ArrowUp":
        dy = -step(coarse, "y");
        break;
      case "ArrowDown":
        dy = step(coarse, "y");
        break;
      default:
        return;
    }
    // Before anything else: arrows scroll the page, and a handle that moves the
    // page under itself is unusable.
    event.preventDefault();
    const current = corners[index];
    const next = clamp({ x: current.x + dx, y: current.y + dy });
    replace(index, next);
    announce(index, next);
  };

  const valid = corners.length === 4;
  const outline = valid
    ? `M${corners.map((c) => `${c.x} ${c.y}`).join("L")}Z`
    : "";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={frameRef}
        className={cn(
          // `w-fit` so the frame hugs the photograph rather than the column.
          // The frame having exactly the image's box is what makes percentage
          // placement exact, and it has to hold at every width.
          //
          // **It must not clip.** A handle sits centred on its corner, so half
          // of its 44px hangs outside the frame — and an absolutely positioned
          // child counts towards `scrollWidth` all the same. With
          // `overflow: hidden` that made the frame a scroll container 22px
          // wider than itself, and a scroll container in a right-to-left page
          // starts scrolled to its right: the photograph was *painted* 22px
          // from the box the handles were positioned against, while
          // `offsetLeft` still read 0. Every corner landed 30 source pixels
          // out. Clipping also ate three quarters of each corner handle's
          // touch target. The rounding it existed for now lives on the image.
          "relative mx-auto w-fit touch-none select-none rounded-lg bg-black/20",
          disabled && "opacity-60",
        )}
      >
        <Image
          src={src}
          alt="عکس اصلی فرش، برای تعیین گوشه‌ها"
          width={imageWidth}
          height={imageHeight}
          // Bounded by the viewport's height as well as the column's width.
          // A portrait carpet at full column width came out 1166px tall in an
          // 800px window: the top and bottom handles could not be on screen at
          // the same time, and placing four corners means seeing four corners.
          // `w-auto`/`h-auto` against the two maxima keeps it proportional
          // whichever limit binds first.
          className="block h-auto max-h-[65vh] w-auto max-w-full rounded-lg"
          draggable={false}
          priority
        />

        {valid && (
          <svg
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden
          >
            {/* Everything outside the quadrilateral, dimmed. One path with an
                even-odd fill punches the shape out of a full-size rectangle,
                so there is no second element to keep in step. */}
            <path
              d={`M0 0H${imageWidth}V${imageHeight}H0Z${outline}`}
              fillRule="evenodd"
              className="fill-black/45"
            />
            <path
              d={outline}
              // Stroke width is in viewBox units, which would render hairline
              // on a 2400-wide box. `non-scaling-stroke` is what keeps it two
              // screen pixels at any display size.
              vectorEffect="non-scaling-stroke"
              strokeWidth={2}
              className="fill-none stroke-accent/90"
            />
          </svg>
        )}

        {valid &&
          corners.map((corner, index) => (
            <button
              key={index}
              type="button"
              disabled={disabled}
              aria-label={`گوشه‌ی ${CORNER_LABELS[index]}`}
              onKeyDown={onKeyDown(index)}
              onPointerDown={(event) => {
                if (disabled) return;
                // Capture first: without it the drag dies the moment the
                // pointer leaves the 44px button, which is immediately.
                event.currentTarget.setPointerCapture(event.pointerId);
                event.preventDefault();
                setDragging(index);
                moveToPointer(index, event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                // The DOM's own answer to «is this handle being dragged», not
                // React's. `dragging` is state, so it is a render behind: press
                // and move inside one task — a fast drag, or a dispatched
                // one — and the first moves are read against `null` and thrown
                // away. Capture is set synchronously in `pointerdown`, so it is
                // true by the time the first move arrives.
                //
                // A guard is still needed: without one, moving the mouse across
                // a handle with no button held would drag the corner.
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                moveToPointer(index, event.clientX, event.clientY);
              }}
              onPointerUp={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                event.currentTarget.releasePointerCapture(event.pointerId);
                setDragging(null);
                announce(index, corners[index]);
              }}
              onPointerCancel={() => setDragging(null)}
              // The touch target is 44px per §3-5; the mark inside it is 18,
              // because a 44px disc would cover the corner it is pointing at.
              className={cn(
                "absolute flex size-11 items-center justify-center rounded-full",
                // Repeated from the frame rather than inherited: `touch-action`
                // does not inherit, and while the spec has an ancestor's `none`
                // cover a touch that starts on a descendant, browsers have not
                // always agreed. Measured `auto` on the button with the frame
                // already `none` — so it is declared where the touch lands.
                "touch-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
              )}
              style={{
                left: `${(corner.x / imageWidth) * 100}%`,
                top: `${(corner.y / imageHeight) * 100}%`,
                // Written out rather than `-translate-x-1/2`: the offset must be
                // physical so it centres on the point in both directions, and a
                // literal transform cannot be mirrored by a future utility.
                transform: "translate(-50%, -50%)",
              }}
            >
              <span
                aria-hidden
                className={cn(
                  "block size-[18px] rounded-full border-2 bg-panel/60 shadow-panel",
                  "transition-colors duration-[--dur-feedback]",
                  dragging === index ? "border-accent bg-accent/30" : "border-accent/90",
                )}
              />
            </button>
          ))}
      </div>

      {/* Arrow-key movement has to be spoken; the handle's own label does not
          change, so without this a screen reader user gets silence. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
