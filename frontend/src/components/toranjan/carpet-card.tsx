"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Cuboid, Heart } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/lib/api/client";
import type { CarpetListItem } from "@/lib/api/types";
import { formatNumber, formatToman } from "@/lib/format";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

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
 */

export interface CarpetCardProps {
  carpet: CarpetListItem;
  /** Position in the grid, for the entrance staircase. */
  index?: number;
  /** Extra gallery images; the listing endpoint only sends the primary one. */
  images?: string[];
  isWishlisted?: boolean;
  onWishlistToggle?: (carpetId: number) => void;
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
}: CarpetCardProps) {
  const gallery = (images?.length ? images : [carpet.primary_image])
    .map((u) => mediaUrl(u))
    .filter((u): u is string => Boolean(u));

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
        <Link href={href} className="relative block aspect-3/4 overflow-hidden bg-bg">
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
              // `contain`, not `cover`: these photographs are cut out to the
              // weave, and cropping one would cut the border off the pattern.
              className="object-contain p-4 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]"
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

          {/* Shown only once something can receive the press. The favourites
              store is not built yet, and a heart that silently does nothing is
              worse than no heart at all. */}
          {onWishlistToggle && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={isWishlisted ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              aria-pressed={isWishlisted}
              className="absolute top-3 end-3 size-9 rounded-full bg-paper/85 shadow-sm backdrop-blur-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWishlistToggle(carpet.id);
              }}
            >
              <Heart className={cn("size-4", isWishlisted && "fill-accent text-accent")} />
            </Button>
          )}
        </Link>

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
