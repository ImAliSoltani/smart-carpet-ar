"use client";

import { useState, ViewTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Cuboid, Heart, Scale } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CornerToggle } from "@/components/toranjan/corner-toggle";
import { mediaUrl } from "@/lib/api/client";
import type { CarpetListItem } from "@/lib/api/types";
import { formatNumber, formatToman } from "@/lib/format";
import { COMPARE_LIMIT } from "@/lib/store/compare";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { CARPET_PHOTO_CLASS, carpetPhotoName } from "@/lib/view-transition";

/**
 * A carpet in the grid.
 *
 * This is 21st.dev's product card, edited into this shop rather than rewritten:
 * the frame, the image carousel with its arrows and dots, the wishlist button
 * in the corner and the footer action are all where the catalogue component put
 * them. What changed is everything that was about clothing.
 *
 * Removed, because §6 of the roadmap closes the scope: the rating and review
 * count (no user reviews), the discount badge and «free shipping» (no discount
 * system). Changed, because a rug is not a shirt: colours are extracted from
 * the photograph rather than chosen by the shopper, so the swatches read rather
 * than select; sizes are real dimensions with their own price and stock, so the
 * card shows how many there are and leaves the choosing to the product page.
 *
 * The footer action is «در خانه‌ی من ببین», not «افزودن به سبد». Nobody buys a
 * carpet from a grid — the thing worth pressing here is the one that answers
 * the question the shop exists to answer.
 *
 * Added since: the comparison toggle, under the heart. A grid is where a
 * comparison starts — four rugs of the same pattern is exactly the moment
 * somebody wants them side by side — so the shortlist is filled from here and
 * read at `/compare`. Both corner controls moved into `CornerToggle`, which is
 * also where the touch-target floor finally got applied to the heart.
 */

export interface CarpetCardProps {
  carpet: CarpetListItem;
  /** Position in the grid, for the entrance staircase. */
  index?: number;
  /** Extra gallery images; the listing endpoint only sends the primary one. */
  images?: string[];
  isWishlisted?: boolean;
  onWishlistToggle?: (carpetId: number) => void;
  isComparing?: boolean;
  /** Absent on grids where a shortlist would mean nothing, like the shortlist. */
  onCompareToggle?: (carpetId: number) => void;
  /** The shortlist is at its limit — offer the toggle, but say why it is shut. */
  compareFull?: boolean;
}

// Per the motion guidance for long lists: 20–40ms between items, and never
// enough total that the last card feels like it is waiting its turn. Twenty-four
// cards at 30ms is 0.7s to fill the page; the cap keeps a longer page honest.
const STAGGER_MS = 30;
const STAGGER_CAP_MS = 420;

export function CarpetCard({
  carpet,
  index = 0,
  images,
  isWishlisted = false,
  onWishlistToggle,
  isComparing = false,
  onCompareToggle,
  compareFull = false,
}: CarpetCardProps) {
  // The card rests on the styled photograph and shows the flat one while the
  // pointer is on it. Both come from the listing endpoint; `cover_image` is
  // null for a carpet with a single photograph, and then the flat is all there
  // is and there is nothing to swap to.
  //
  // Resting on the styled shot rather than the flat one is a shop decision, not
  // a technical one: the flat is the honest view of the goods, but a grid of
  // twenty-four of them is twenty-four rectangles of pattern with no air in
  // them, and a کناره — 0.26 wide against a 0.75 frame — is a narrow strip
  // stranded in the middle of a card. The room shot gives every card the same
  // shape and the same light. The rug itself is one hover away, and one tap
  // away on the product page.
  const gallery = (images?.length ? images : [carpet.cover_image ?? carpet.primary_image])
    .map((u) => mediaUrl(u))
    .filter((u): u is string => Boolean(u));

  // The flat, revealed on hover — but only when it is not already what the card
  // is resting on, and never when a caller supplied its own gallery to page
  // through, because then the reveal and the carousel would fight.
  const revealed =
    !images?.length && carpet.cover_image ? mediaUrl(carpet.primary_image) : undefined;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const href = `/carpets/${carpet.slug}`;

  // The stylesheet's reduced-motion block cannot reach this component: framer
  // writes transforms as inline style through JavaScript, so a CSS rule that
  // zeroes animation durations never applies to it. The roadmap allows no
  // exceptions here, so the hook is what enforces it — and the card must start
  // visible rather than fade in, or a visitor who asked for less motion would
  // be handed an empty grid.
  const reduced = useReducedMotion();

  const step = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + delta + gallery.length) % gallery.length);
  };

  return (
    <motion.div
      // Carries the scroll timeline the photograph inside drifts on. It has to
      // be out here: the frame below clips, and a clip is a scroll container,
      // which pins `view()` progress to the middle forever. See the note in
      // globals.css. framer owns this element's `transform`; the timeline only
      // animates a custom property, so the two never touch.
      className="toranjan-drift-scope"
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: 0.42,
        ease: [0.16, 1, 0.3, 1],
        delay: Math.min(index * STAGGER_MS, STAGGER_CAP_MS) / 1000,
      }}
      // A hover that lifts and settles. Framer reverses the same tween on
      // leave, which is what stops the card sticking in its raised state when
      // the pointer goes in a hurry.
      whileHover={reduced ? undefined : { y: -4 }}
    >
      <Card className="group w-full overflow-hidden rounded-md border-line bg-paper shadow-none transition-shadow duration-300 hover:shadow-[0_24px_50px_-32px_rgba(24,24,27,0.45)]">
        {/* The half of the shared transition that lives in the grid. React adds
            no element of its own here — it writes `view-transition-name` onto
            the frame below for the length of the navigation and takes it off
            again, which is why the name can be per-carpet without twenty-four
            of them ever being live at once on a page that is not navigating.

            The frame rather than the photograph inside it: the border and the
            rounding are part of what the eye is following, and a bare `<img>`
            morphing out of a frame that stays behind reads as two things
            happening instead of one. */}
        <ViewTransition name={carpetPhotoName(carpet.slug)} default={CARPET_PHOTO_CLASS}>
          <Link href={href} className="relative block aspect-3/4 overflow-hidden bg-bg">
            {/* The drift lives on a layer of its own, not on the photograph.
                The photograph already owns a transform — the hover scale below
                — and two rules writing `transform` on one element means the
                last one wins rather than both applying. A wrapper gives each
                its own, and they compose the way the eye expects: the frame
                holds still, the layer drifts with the scroll, the picture
                inside it leans in under the pointer.

                Only when `revealed` exists, and that is not a detail. That is
                the case where this layer is the *room* shot and `object-cover`
                is already cropping it, so drifting reveals more of a photograph
                rather than exposing the edge of a cut-out. On a single-image
                carpet this layer is the rug itself at `object-contain`, and
                sliding a letterboxed cut-out inside its own padding is not
                parallax, it is a picture that will not sit still. */}
            <div className={cn("absolute inset-0", revealed && "toranjan-drift")}>
            {gallery[currentImageIndex] && (
              <Image
                key={currentImageIndex}
                src={gallery[currentImageIndex]}
                alt={carpet.name}
                fill
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw"
                // The first row is above the fold on every breakpoint and is the
                // largest thing painted; lazy-loading it means measuring our own
                // LCP against a placeholder. Four covers the widest grid.
                priority={index < 4}
                className={cn(
                  "transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]",
                  // `contain` with air around it when this is the rug itself:
                  // the photograph is cut out to the weave, and cropping one
                  // would cut the border off the pattern. `cover` when it is a
                  // room, because a photograph of a room is not a cut-out and
                  // letterboxing one inside a card reads as a mistake.
                  revealed ? "object-cover" : "object-contain p-4",
                )}
              />
            )}
            </div>

            {/* The rug itself, on top, faded in while the pointer is on the
                card.

                `hidden` under `(hover: none)` is what keeps this off phones,
                and it has to be written out: Tailwind v4 wraps *some* hover
                utilities in `@media (hover: hover)` but emits
                `group-hover:opacity-100` ungated, and a tap on a touch screen
                raises `:hover`. `display: none` outranks the opacity either
                way, and it also means the file is never fetched — a lazy image
                in a `display: none` box is never in the viewport to load. So a
                phone pays nothing for a layer it will not use.

                It carries its own background: `object-contain` leaves the
                padding transparent, and without one the room shot underneath
                would show around the rug's edges for the length of the fade. */}
            {revealed && (
              <Image
                src={revealed}
                alt=""
                aria-hidden
                fill
                loading="lazy"
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw"
                className="bg-bg object-contain p-4 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03] group-hover:opacity-100 [@media(hover:none)]:hidden"
              />
            )}

            {gallery.length > 1 && (
              <>
                <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="عکس بعدی"
                    className="size-9 rounded-full bg-paper/85 shadow-sm backdrop-blur-sm"
                    onClick={step(1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="عکس قبلی"
                    className="size-9 rounded-full bg-paper/85 shadow-sm backdrop-blur-sm"
                    onClick={step(-1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`عکس ${formatNumber(i + 1)}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === currentImageIndex ? "w-4 bg-ink" : "w-1.5 bg-ink/25",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImageIndex(i);
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Shown only once something can receive the press. A control that
                silently does nothing is worse than no control at all — which is
                why each of these appears with its handler and not before.

                The column is 1.5 rather than 3 from the corner because the pills
                inside it are inset 4px of their own: the 44px hit areas touch
                each other, the 36px discs keep an 8px gap, and the picture is
                where it was. */}
            {(onWishlistToggle || onCompareToggle) && (
              <div className="absolute top-1.5 end-1.5 flex flex-col">
                {onWishlistToggle && (
                  <CornerToggle
                    label={isWishlisted ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                    pressed={isWishlisted}
                    onPress={() => onWishlistToggle(carpet.id)}
                  >
                    <Heart className={cn("size-4", isWishlisted && "fill-accent text-accent")} />
                  </CornerToggle>
                )}

                {onCompareToggle && (
                  <CornerToggle
                    label={
                      isComparing
                        ? "برداشتن از مقایسه"
                        : compareFull
                          ? `فهرست مقایسه پر است — حداکثر ${formatNumber(COMPARE_LIMIT)} فرش`
                          : "افزودن به مقایسه"
                    }
                    pressed={isComparing}
                    // Full and not already chosen is the only dead case, and it
                    // is dead with a sentence attached rather than silently.
                    disabled={compareFull && !isComparing}
                    onPress={() => onCompareToggle(carpet.id)}
                  >
                    <Scale className={cn("size-4", isComparing && "text-accent")} />
                  </CornerToggle>
                )}
              </div>
            )}
          </Link>
        </ViewTransition>

        <CardContent className="p-4">
          {/* Pattern and material, not origin: the listing endpoint does not
              send origin, and the column is not clean enough to show yet. */}
          <p className="text-[11px] tracking-[0.14em] text-muted">
            {PATTERN_LABEL[carpet.pattern]} · {MATERIAL_LABEL[carpet.material]}
          </p>

          <h3 className="mt-2 line-clamp-2 min-h-[3.6em] text-sm leading-[1.8]">
            <Link
              href={href}
              className="bg-[linear-gradient(var(--ink),var(--ink))] bg-[length:0_1px] bg-[position:right_bottom] bg-no-repeat transition-[background-size] duration-[550ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:bg-[length:100%_1px]"
            >
              {carpet.name}
            </Link>
          </h3>

          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[11.5px] text-muted">از</span>
            <span className="text-[17px] font-semibold tracking-tight">
              {formatToman(carpet.min_price)}
            </span>
          </p>

          <p className="mt-2 text-xs text-accent">
            {formatNumber(carpet.sizes_count)} اندازه
          </p>

          {/* Read, not chosen — these come out of the photograph at ingest. */}
          {carpet.colors.length > 0 && (
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {carpet.colors.slice(0, 4).map((hex, i) => (
                <span
                  key={hex + i}
                  className="size-3.5 scale-75 rounded-full opacity-60 ring-1 ring-ink/10 transition-all duration-[450ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-100 group-hover:opacity-100"
                  style={{ backgroundColor: hex, transitionDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button
            asChild
            variant="outline"
            // `h-11`: the outline variant defaults to 40px, four short of the
            // §3-5 floor, and this is the card's only action.
            className="h-11 w-full gap-2 rounded-full border-line-2 transition-colors duration-[--dur-feedback] hover:bg-cta hover:text-on-cta"
          >
            <Link href={`${href}#ar`}>
              <Cuboid className="size-[18px] text-accent" />
              در خانه‌ی من ببین
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
