"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Image Accordion — [uilayout/tailwind-image-accordion](https://21st.dev/@uilayout.contact/components/tailwind-image-accordion).
 *
 * A row of photographs where pointing at one widens it and squeezes the rest.
 * Its mechanism is kept exactly: no state, no measuring, no JavaScript at all —
 * a `group` on the row, `:not(:hover)` on each panel, and the browser animates
 * the difference. Focus is wired to the same rules, so a keyboard walks the row
 * and sees the same thing a mouse does.
 *
 * What changed, and why each change had to happen:
 *
 * - **The labels no longer hide.** The original reveals the title only on
 *   hover, which means a touch device is handed a row of unlabelled
 *   photographs — and a wide touch screen (a tablet, a touchscreen laptop) sits
 *   above the breakpoint and gets the row *without* ever firing a hover. This
 *   row is navigation: what each panel leads to has to be legible before
 *   anyone touches it. The hover keeps the flourish — the panel widens, the
 *   veil lifts, and a third line arrives — but it no longer carries the
 *   destination.
 * - **No tap-to-expand.** Panels that open on the first tap and follow the
 *   link on the second turn one destination into two taps, and the first tap
 *   reads as a broken link. Here a tap is always the link.
 * - **`w-[20%]` became flex-grow.** That number was written for three panels;
 *   with five, four collapsed panels at 20% each leave the *hovered* one 20%,
 *   which shrinks the thing being pointed at. Growth ratios hold whatever the
 *   count is: 2 against 0.75 gives the open panel about 40% of the row.
 * - **A grid below `md`, not a column.** The original stacks full-width
 *   photographs, which is five screenfuls of scrolling. Two columns with the
 *   first panel spanning both keeps the whole set on one screen. It is
 *   deliberately not a swipeable rail — this repo removed a sideways gesture
 *   once already, for faults on real phones that no test could see.
 * - **Tokens for the ring and the veil.** `ring-indigo-300` is not in this
 *   palette, and the original's `bg-white/30` veil with a blur washed a warm
 *   photograph out to nothing.
 */

export interface AccordionPanel {
  /** Stable key, and the value the destination is filtered by. */
  key: string;
  title: string;
  /** The quiet second line — a count, a price, whatever the row counts by. */
  meta?: string;
  href: string;
  image: StaticImageData;
  alt: string;
}

export function ImageAccordion({
  panels,
  /** Shown under the title on the open panel only. */
  openLabel,
  className,
}: Readonly<{
  panels: AccordionPanel[];
  openLabel?: string;
  className?: string;
}>) {
  return (
    <ul className={cn("group grid grid-cols-2 gap-3 md:flex md:gap-2", className)}>
      {panels.map((panel, i) => (
        <li
          key={panel.key}
          className={cn(
            // The first photograph is the widest of the set on a phone, where
            // there is no hover to make any panel the important one. It is
            // also the only one shaped landscape, because a tile twice as wide
            // as its neighbours would otherwise be twice as tall as well.
            i === 0 ? "col-span-2 aspect-4/3" : "aspect-3/4",
            // The row sets one height for every panel and the aspect ratios
            // stop applying — a panel's shape is its share of the row.
            "min-w-0 md:aspect-auto md:h-[26rem] md:flex-1",
            // Growth, not width — see the note above. Both halves of the pair
            // are needed: one opens the panel under the pointer, the other
            // closes the four that are not.
            "md:transition-[flex-grow] md:duration-[450ms] md:ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:md:transition-none",
            "md:hover:grow-[2] md:not-[&:hover]:group-hover:grow-[0.75]",
            "md:focus-within:grow-[2] md:[&:not(:focus-within):not(:hover)]:group-focus-within:grow-[0.75]",
          )}
        >
          <article
            className={cn(
              "group/panel relative isolate h-full overflow-hidden rounded-xl",
              // The veil over every panel that is not the one being pointed
              // at. It sits above the photograph and below the link, so the
              // label stays readable while the picture recedes.
              "after:pointer-events-none after:absolute after:inset-0 after:bg-paper/35 after:opacity-0 after:transition-opacity after:duration-[450ms]",
              "md:not-[&:hover]:group-hover:after:opacity-100 md:[&:not(:focus-within):not(:hover)]:group-focus-within:after:opacity-100",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            )}
          >
            <Link
              href={panel.href}
              className="absolute inset-0 z-10 flex flex-col justify-end p-4 text-white focus:outline-none"
            >
              <h3 className="truncate text-base font-bold drop-shadow-sm sm:text-lg">
                {panel.title}
              </h3>
              {panel.meta && (
                <p className="mt-1 truncate text-[13px] text-white/80 drop-shadow-sm">
                  {panel.meta}
                </p>
              )}
              {openLabel && (
                // Only ever on the open panel, and only where a pointer can
                // open one. On a collapsed panel there is no room for it, and
                // on a phone every panel is already open.
                <p
                  className={cn(
                    "mt-2 hidden text-[13px] font-medium text-white drop-shadow-sm md:block",
                    "md:translate-y-1 md:opacity-0 md:transition md:duration-300 md:ease-[cubic-bezier(.16,1,.3,1)]",
                    "md:group-hover/panel:translate-y-0 md:group-hover/panel:opacity-100 md:group-hover/panel:delay-200",
                    "md:group-focus-within/panel:translate-y-0 md:group-focus-within/panel:opacity-100 md:group-focus-within/panel:delay-200",
                    "motion-reduce:md:transition-none",
                  )}
                >
                  {openLabel}
                </p>
              )}
            </Link>

            {/* Always on, unlike the original's hover-only gradient: the label
                it makes readable is now always on too. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-2/5 bg-linear-to-t from-black/75 via-black/35 to-transparent"
            />

            <Image
              src={panel.image}
              alt={panel.alt}
              // A panel is at its widest about 40% of a 1200px row, and half
              // the screen on a phone. Asking for more than that is asking the
              // visitor to download a photograph nothing will ever draw.
              sizes="(min-width: 768px) 40vw, 50vw"
              className="size-full object-cover"
            />
          </article>
        </li>
      ))}
    </ul>
  );
}
