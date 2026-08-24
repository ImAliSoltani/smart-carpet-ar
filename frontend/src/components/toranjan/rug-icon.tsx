import * as React from "react";

/**
 * A rug, seen from above.
 *
 * **Drawn rather than imported, because no icon set has one.** Lucide has no
 * rug and neither does Phosphor; the bar was using `LayoutGrid`, which says
 * «a grid of things» — true of the listing page and true of every listing page
 * ever made. In a shop that sells one kind of object, the item that means «the
 * carpets» should be a carpet.
 *
 * It stays inside lucide's grammar so it sits level with the four beside it: a
 * 24 viewBox, `currentColor`, no fills, and `strokeWidth` / `size` passed in by
 * the caller rather than baked. Introducing a second icon library for one glyph
 * would have cost more consistency than it bought.
 *
 * Three marks and no more, because the bar draws this at 21px: the rug's edge,
 * its border, and a توranj at the centre — which is the brand's own mark and
 * the thing that stops the outline reading as a picture frame. Fringe was
 * tried and removed; at this size it is four grey specks.
 */
export function RugIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* The rug, and the medallion in the middle of it. Two marks, because
          three did not survive being looked at.

          The first two attempts drew the rug's border band as a second nested
          rectangle. At 140px that is a carpet; at the 21px this is actually
          rendered at, two 1.75-wide strokes three units apart merge and the
          glyph fills in solid — a dark lozenge-shaped blob beside four airy
          lucide outlines. Widening the gap only moved the size at which it
          happened.

          So the band is gone and the medallion carries the meaning on its own.
          It is the brand's own toranj, which is the right thing for it to be:
          a bare rounded rectangle is a frame, and a rectangle with a lozenge
          centred in it is a patterned rug. */}
      <rect x="2.5" y="7" width="19" height="10" rx="2" />
      <path d="M12 9.4 14.2 12 12 14.6 9.8 12Z" />
    </svg>
  );
}
