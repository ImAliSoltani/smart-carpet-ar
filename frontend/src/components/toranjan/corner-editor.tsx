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

/** Diameter of the magnifier, and how much it enlarges what is on screen. */
const LOUPE_SIZE = 132;
const LOUPE_ZOOM = 3;
/** Gap between the corner and the magnifier, clear of a fingertip. */
const LOUPE_OFFSET = 40;

/**
 * The patch of photograph under the finger, shown beside it.
 *
 * The thing being placed is exactly the thing a fingertip covers, and on a
 * phone that makes precise placement guesswork — the same reason photo editors
 * and erasers put a loupe on screen the moment you touch the canvas. So the
 * corner is drawn again, enlarged, somewhere the hand is not.
 *
 * It is the same file as a background rather than a second `<img>`: the
 * background box is already a window onto a scaled image, which is all a
 * magnifier is. Enlargement is relative to the *painted* size, not the source,
 * because the point is to show more than the screen is showing.
 *
 * It flips below the corner when there is no room above, which is what the top
 * two corners always want.
 */
function Loupe({
  src,
  corner,
  imageWidth,
  imageHeight,
  frameSize,
}: {
  src: string;
  corner: CornerPoint;
  imageWidth: number;
  imageHeight: number;
  frameSize: { width: number; height: number };
}) {
  const px = (corner.x / imageWidth) * frameSize.width;
  const py = (corner.y / imageHeight) * frameSize.height;
  const below = py < LOUPE_SIZE + LOUPE_OFFSET;

  // Kept inside the frame horizontally. Centred on a corner that sits on the
  // image's own edge, half the circle hangs past it — and measured at a narrow
  // width that was enough to put the whole page into horizontal scroll, which
  // §3-5 does not allow. Sliding the *box* costs nothing: the background offset
  // below is written relative to the circle's centre, so the crosshair keeps
  // pointing at the corner wherever the circle ends up.
  const half = LOUPE_SIZE / 2;
  const boxX =
    frameSize.width < LOUPE_SIZE
      ? frameSize.width / 2
      : Math.min(Math.max(px, half), frameSize.width - half);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 overflow-hidden rounded-full border-2 border-accent/80 bg-black shadow-panel"
      style={{
        left: `${boxX}px`,
        top: `${(corner.y / imageHeight) * 100}%`,
        width: LOUPE_SIZE,
        height: LOUPE_SIZE,
        transform: below
          ? `translate(-50%, ${LOUPE_OFFSET}px)`
          : `translate(-50%, calc(-100% - ${LOUPE_OFFSET}px))`,
        backgroundImage: `url("${src}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${frameSize.width * LOUPE_ZOOM}px ${frameSize.height * LOUPE_ZOOM}px`,
        // The corner's magnified position, pulled back to the centre of the
        // circle — so the middle of the loupe is always the point itself.
        backgroundPosition: `${-(px * LOUPE_ZOOM - LOUPE_SIZE / 2)}px ${-(py * LOUPE_ZOOM - LOUPE_SIZE / 2)}px`,
      }}
    >
      {/* Without a mark, a magnified patch of weave does not say which pixel is
          the corner. The crosshair is that answer. */}
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-accent/80" />
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent/80" />
      <span className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/90" />
    </div>
  );
}

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
  // Set by an arrow key, not by focus.
  //
  // Letting go is the decision: the corner is where it was put, and a
  // magnifier still hanging over the photograph after the finger has left says
  // the opposite — that something is still being chosen. So the loupe belongs
  // to the *gesture*, and both gestures end on their own. A press ends at
  // `pointerup`; keyboard editing ends when the handle is left.
  //
  // It cannot key off focus: pressing a handle focuses it too, so «shown while
  // focused» is «shown forever after the first press».
  const [keying, setKeying] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState("");

  // The frame's painted size, kept current by the element itself.
  //
  // Placing the handles never needs this — percentages do that — but the
  // magnifier does: it has to enlarge relative to what is actually on screen,
  // and «what is on screen» changes with the window, the rail opening, and the
  // 65vh cap. An observer is the one way to hold this number without it going
  // stale, and writing state from its callback is a subscription, not an
  // effect body.
  const [frameSize, setFrameSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setFrameSize({ width: box.width, height: box.height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

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

  const pointerToSource = React.useCallback(
    (clientX: number, clientY: number): CornerPoint | null => {
      const frame = frameRef.current;
      if (!frame) return null;
      const rect = frame.getBoundingClientRect();
      // A frame with no size means the image has not laid out yet; dividing by
      // it would write `Infinity` into a corner.
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * imageWidth,
        y: ((clientY - rect.top) / rect.height) * imageHeight,
      };
    },
    [imageWidth, imageHeight],
  );

  /**
   * Where the corner sat relative to the finger when it was grabbed.
   *
   * **The drag is relative, and that is the whole fix for «it jumps».** It used
   * to be absolute: `pointerdown` moved the corner to wherever the press
   * landed. A mouse is clicked dead centre on the mark so the jump is zero,
   * which is why nothing caught it — but the touch target is 44px around an
   * 18px mark, and a fingertip lands anywhere inside it. Every grab therefore
   * threw the corner up to twenty screen pixels before the drag had begun, and
   * a screen pixel here is two and a half pixels of photograph.
   *
   * Holding the offset means the corner does not move until the finger does,
   * and then moves exactly as far. It also lets the finger sit *beside* the
   * point it is placing instead of on top of it — which is what the loupe was
   * always for.
   */
  const grabOffset = React.useRef<CornerPoint>({ x: 0, y: 0 });

  const dragToPointer = React.useCallback(
    (index: number, clientX: number, clientY: number) => {
      const point = pointerToSource(clientX, clientY);
      if (!point) return;
      replace(index, {
        x: point.x + grabOffset.current.x,
        y: point.y + grabOffset.current.y,
      });
    },
    [pointerToSource, replace],
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
    // A way to put the magnifier away without leaving the handle.
    if (event.key === "Escape") {
      setKeying(null);
      return;
    }
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
    // Keyboard editing has started, so the magnifier is wanted — this is the
    // case that cannot see what it is doing either, for the opposite reason:
    // nothing is covering the point, but a nudge of a few source pixels is
    // invisible at the size the photograph is drawn.
    setKeying(index);
    const current = corners[index];
    const next = clamp({ x: current.x + dx, y: current.y + dy });
    replace(index, next);
    announce(index, next);
  };

  // A drag wins: while the pointer is down it is the thing being aimed.
  const active = dragging ?? keying;

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
              onBlur={() => setKeying((current) => (current === index ? null : current))}
              onPointerDown={(event) => {
                if (disabled) return;
                // A press supersedes keyboard editing of any handle.
                setKeying(null);
                // Capture first: without it the drag dies the moment the
                // pointer leaves the 44px button, which is immediately.
                event.currentTarget.setPointerCapture(event.pointerId);
                event.preventDefault();
                // `preventDefault` on `pointerdown` also cancels the default
                // *focus*, so pressing a handle left it unfocused and the arrow
                // keys went to the page — «the keyboard does nothing», reported
                // from a desktop. It cannot simply be dropped: it is what stops
                // the press selecting text and starting a native image drag.
                // So focus is asked for explicitly.
                event.currentTarget.focus();
                setDragging(index);
                // Remember where the corner is relative to the finger, and
                // leave it exactly where it is. Nothing moves on a press.
                const at = pointerToSource(event.clientX, event.clientY);
                grabOffset.current = at
                  ? { x: corners[index].x - at.x, y: corners[index].y - at.y }
                  : { x: 0, y: 0 };
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
                dragToPointer(index, event.clientX, event.clientY);
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

        {/* Shown for whichever corner is being worked on — dragged under a
            finger, or focused and being nudged by the arrow keys, which is the
            case that also wanted magnification. */}
        {valid && !disabled && active !== null && frameSize.width > 0 && (
          <Loupe
            src={src}
            corner={corners[active]}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            frameSize={frameSize}
          />
        )}
      </div>

      <p className="text-[12.5px] leading-relaxed text-muted">
        هنگام جابه‌جا کردن هر گوشه، همان نقطه بزرگ‌شده کنار انگشت نشان داده می‌شود.
      </p>

      {/* Arrow-key movement has to be spoken; the handle's own label does not
          change, so without this a screen reader user gets silence. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
