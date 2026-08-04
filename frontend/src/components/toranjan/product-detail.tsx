"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ChevronRight, Cuboid, Heart, Info, Ruler, Share2, Tag, Users } from "lucide-react";

import { AddToCart } from "@/components/toranjan/add-to-cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { mediaUrl } from "@/lib/api/client";
import type { CarpetDetail, VariantOut } from "@/lib/api/types";
import { formatNumber, formatSize, formatToman } from "@/lib/format";
import { MATERIAL_LABEL, PATTERN_LABEL, ROOM_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The product page.
 *
 * From [kavikatiyar/product-detail-page](https://21st.dev/@kavikatiyar/components/product-detail-page),
 * whose shape is kept exactly: breadcrumbs, the favourite and share pair in the
 * corner, a two-column split with the gallery cross-fading between images over
 * its row of dots, a «find similar» button under it, then title, price, two
 * large actions, a row of tag badges, the description.
 *
 * It carries less than our API does, so the gaps are filled in its own idiom
 * rather than by bolting on a different-looking block:
 *
 * - **Sizes.** The largest gap. Every size of a rug is its own purchase with
 *   its own price, stock and AR file, which the component had no notion of, so
 *   the selector is built as a row in the same weight as its action buttons and
 *   sits directly above them — price and stock below it answer to whatever is
 *   chosen.
 * - **The first action is «در خانه‌ی من ببین», not «buy now»**, because that is
 *   this shop's argument. It takes the place its primary button already had.
 * - **Its `tags` row becomes the specification list**, which is what the badges
 *   were already doing — pattern, material, origin, the rooms a rug suits.
 * - **«Find Similar» keeps its position** and now does the real thing: the
 *   neighbours of this rug's own embedding, further down the page.
 * - **The gallery zooms** (§6-3), through
 *   [ui/zoomable-image](../ui/zoomable-image.tsx). The cross-fade and the row
 *   of dots are untouched; a click on the photograph now opens it full-screen
 *   at the 1600px derivative instead of doing nothing.
 *
 * Removed, because §6 of the roadmap closes the scope: the seller block with
 * its avatar and stars (this is one shop, and there are no reviews) and the
 * shipping line (there is no shipping calculation).
 */

export function ProductDetail({
  carpet,
  similar,
}: {
  carpet: CarpetDetail;
  similar?: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  // Each photograph twice over: the 800px derivative for the page, and the
  // 1600px one for the lightbox. `full_url` is null on rows ingested before the
  // derivative columns existed, and there the card file has to stand in — a
  // soft zoom is worse than a sharp one but far better than a 404.
  const gallery = carpet.images
    .map((image) => ({
      src: mediaUrl(image.url),
      zoomSrc: mediaUrl(image.full_url ?? image.url),
    }))
    .filter((entry): entry is { src: string; zoomSrc: string } => Boolean(entry.src));

  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  // Cheapest first: the number under the title should be the one the card in
  // the grid promised, and that card shows the lowest price.
  const variants = React.useMemo(
    () => [...carpet.variants].sort((a, b) => Number(a.price) - Number(b.price)),
    [carpet.variants],
  );
  const [selectedId, setSelectedId] = React.useState<number | null>(variants[0]?.id ?? null);
  const selected: VariantOut | undefined =
    variants.find((v) => v.id === selectedId) ?? variants[0];

  const arReady = selected?.ar_status === "ready" && Boolean(selected.glb_url);

  const specs: { label: string; icon: React.ElementType }[] = [
    { label: PATTERN_LABEL[carpet.pattern], icon: Tag },
    { label: MATERIAL_LABEL[carpet.material], icon: Info },
    ...(carpet.origin ? [{ label: carpet.origin, icon: Ruler }] : []),
    ...carpet.suitable_rooms.map((room) => ({ label: ROOM_LABEL[room], icon: Users })),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-24 sm:px-8">
      <nav aria-label="مسیر" className="mb-4 flex items-center gap-1 pt-8 text-sm text-muted">
        <Link href="/" className="transition-colors duration-[--dur-feedback] hover:text-ink">
          ترنجان
        </Link>
        <ChevronRight className="size-4 rotate-180" />
        <Link href="/carpets" className="transition-colors duration-[--dur-feedback] hover:text-ink">
          فرش‌ها
        </Link>
        <ChevronRight className="size-4 rotate-180" />
        <span className="line-clamp-1 text-ink-2">{carpet.name}</span>
      </nav>

      <div className="mb-6 flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="علاقه‌مندی">
          <Heart className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="اشتراک‌گذاری">
          <Share2 className="size-5" />
        </Button>
      </div>

      <main className="grid grid-cols-1 gap-8 lg:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              // `false`, never a branch on `useReducedMotion`. That hook answers
              // differently on the server than in the browser, so branching on it
              // rendered `opacity: 0` into the HTML and `opacity: 1` after
              // hydration — a real mismatch React refuses to patch up.
              //
              // It is also the better behaviour: this photograph is the largest
              // thing painted on the page, and the first one should be there
              // rather than arrive. The cross-fade is for changing image, which
              // only ever happens after a click.
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -20 }}
              transition={{ duration: reduced ? 0 : 0.3 }}
              className="toranjan-zoom-frame relative aspect-4/5 w-full overflow-hidden rounded-xl border border-line bg-bg"
            >
              {gallery[currentImageIndex] && (
                <ZoomableImage
                  src={gallery[currentImageIndex].src}
                  zoomSrc={gallery[currentImageIndex].zoomSrc}
                  alt={`${carpet.name} — تصویر ${formatNumber(currentImageIndex + 1)}`}
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  priority
                  // `contain`, not `cover`: these photographs are cut to the
                  // weave and cropping one takes the border off the pattern.
                  className="object-contain p-6"
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {gallery.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    currentImageIndex === index ? "w-5 bg-ink" : "w-2 bg-ink/25 hover:bg-ink/40",
                  )}
                  aria-label={`تصویر ${formatNumber(index + 1)}`}
                  aria-current={currentImageIndex === index}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2 rounded-full border-line-2" asChild>
              <a href="#similar">
                <Camera className="size-4" /> فرش‌های مشابه
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-light leading-[1.35] tracking-tight md:text-4xl">
            {carpet.name}
          </h1>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight md:text-4xl">
              {formatToman(selected?.price)}
            </span>
            {selected && selected.stock <= 0 && (
              <span className="text-sm text-destructive">ناموجود</span>
            )}
          </div>

          {/* Sizes — the component had no concept of a variant, and for a rug it
              is the whole purchase: each one its own price, stock and AR file. */}
          {variants.length > 0 && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-[12px] tracking-[0.1em] text-muted">
                اندازه — {formatNumber(variants.length)} گزینه
              </legend>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => {
                  const on = variant.id === selected?.id;
                  const out = variant.stock <= 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedId(variant.id)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-md border px-4 py-2.5 text-sm transition-colors duration-[--dur-feedback]",
                        on
                          ? "border-ink bg-cta text-on-cta"
                          : "border-line-2 hover:border-ink hover:bg-bg",
                        out && !on && "text-muted line-through",
                      )}
                    >
                      {formatSize(variant.width_cm, variant.length_cm)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="my-6 flex flex-col gap-2 sm:flex-row">
            {/* The shop's argument takes the primary slot the component gave to
                «buy now». Nobody buys a rug they have not seen on their floor. */}
            <Button
              size="lg"
              className="h-13 flex-1 gap-2 rounded-full text-[15px]"
              disabled={!arReady}
              asChild={arReady}
            >
              {arReady ? (
                <Link href={`/carpets/${carpet.slug}/ar?variant=${selected?.id}`}>
                  <Cuboid className="size-5" /> در خانه‌ی من ببین
                </Link>
              ) : (
                <span>
                  <Cuboid className="size-5" /> فایل واقعیت افزوده هنوز آماده نیست
                </span>
              )}
            </Button>
            <div className="flex-1">
              <AddToCart />
            </div>
          </div>

          {/* The tag row was already a specification list in everything but
              name; it now carries the specification. */}
          <div className="mb-6 flex flex-wrap gap-2">
            {specs.map((spec, index) => (
              <Badge
                key={spec.label + index}
                variant="secondary"
                className="gap-2 rounded-full border-line bg-bg px-3 py-1 text-sm font-normal text-ink-2"
              >
                <spec.icon className="size-4 text-muted" />
                {spec.label}
              </Badge>
            ))}
          </div>

          {carpet.colors.length > 0 && (
            <div className="mb-6 flex items-center gap-3">
              <span className="text-[12px] tracking-[0.1em] text-muted">رنگ‌های غالب</span>
              <div className="flex gap-1.5" aria-hidden="true">
                {carpet.colors.slice(0, 5).map((hex, i) => (
                  <span
                    key={hex + i}
                    className="size-4 rounded-full ring-1 ring-ink/10"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {carpet.description && (
            <p className="leading-loose text-muted">{carpet.description}</p>
          )}
        </div>
      </main>

      {similar}
    </div>
  );
}
