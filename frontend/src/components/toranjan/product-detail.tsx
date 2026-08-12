"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Camera,
  ChevronRight,
  Cuboid,
  Heart,
  Info,
  Ruler,
  Scale,
  Share2,
  Tag,
  Users,
} from "lucide-react";

import { AddToCart } from "@/components/toranjan/add-to-cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { mediaUrl } from "@/lib/api/client";
import type { CarpetDetail, VariantOut } from "@/lib/api/types";
import { formatNumber, formatSize, formatToman } from "@/lib/format";
import { useCartStore } from "@/lib/store/cart";
import { COMPARE_LIMIT, useCompare } from "@/lib/store/compare";
import { useFavorites } from "@/lib/store/favorites";
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
 * - **And it can be swiped or stepped through.** The dots alone left a reader
 *   who had pinched into the weave with nothing to reach but a target below
 *   the photograph. A horizontal drag and, on pointer devices, a pair of
 *   arrows at the frame's edges now do the same job without leaving the
 *   photograph.
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
  const favorites = useFavorites();
  const compare = useCompare();
  const addToCart = useCartStore((state) => state.add);

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

  /* ---- moving between photographs -------------------------------------
     The row of dots was the only way through the gallery, and it is the
     wrong only-way on a phone: it sits under the photograph, so a reader who
     has pinch-zoomed in on the weave has to zoom back out to reach it. A
     swipe stays where the eye already is. On a pointer device there is no
     swipe, so the same move is a pair of arrows at the edges of the frame.

     The dots stay. They are the only control a screen reader or a keyboard
     can address by position, and they are the only one that says how many
     photographs there are. */
  const imageCount = gallery.length;

  const goToImage = React.useCallback(
    (index: number) => {
      if (imageCount === 0) return;
      // wraps both ways, so the last photograph leads back to the first
      setCurrentImageIndex(((index % imageCount) + imageCount) % imageCount);
    },
    [imageCount],
  );

  /* Which way is «next». The page is RTL, so the gallery runs right to left:
     photograph two sits to the left of photograph one. Bringing it into view
     means moving the strip rightwards, so a drag towards +x advances — the
     mirror of what the same gesture does in an LTR carousel. The arrow keys
     flip with it, which is the rule this repo already learned the hard way. */
  const NEXT_DRAG_SIGN = 1;
  const SWIPE_DISTANCE = 60; // px
  const SWIPE_VELOCITY = 400; // px/s — a flick that never travels far

  // A drag that ends over the photograph still fires a click, and the click
  // would open the lightbox. Measure the pointer's travel and swallow it.
  const pointerStartX = React.useRef<number | null>(null);
  const swallowNextClick = React.useRef(false);

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
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
          aria-label={
            favorites.has(carpet.id) ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"
          }
          aria-pressed={favorites.has(carpet.id)}
          onClick={() => favorites.toggle(carpet.id)}
        >
          <Heart
            className={cn("size-5", favorites.has(carpet.id) && "fill-accent text-accent")}
          />
        </Button>
        {/* The shortlist, from the page as well as from the grid. Somebody who
            has read this far and is not convinced is exactly the person who
            wants it beside two others. Disabled only when the shortlist is full
            and this carpet is not on it — with the reason in the label, because
            a control that is dead and silent is the thing the tray avoids. */}
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full disabled:opacity-40"
          aria-label={
            compare.has(carpet.id)
              ? "برداشتن از مقایسه"
              : compare.isFull
                ? `فهرست مقایسه پر است — حداکثر ${formatNumber(COMPARE_LIMIT)} فرش`
                : "افزودن به مقایسه"
          }
          aria-pressed={compare.has(carpet.id)}
          title={
            compare.isFull && !compare.has(carpet.id)
              ? `فهرست مقایسه پر است — حداکثر ${formatNumber(COMPARE_LIMIT)} فرش`
              : "مقایسه"
          }
          disabled={compare.isFull && !compare.has(carpet.id)}
          onClick={() => compare.toggle(carpet.id)}
        >
          <Scale className={cn("size-5", compare.has(carpet.id) && "text-accent")} />
        </Button>
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label="اشتراک‌گذاری">
          <Share2 className="size-5" />
        </Button>
      </div>

      <main className="grid grid-cols-1 gap-8 lg:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-4">
          {/* The frame re-mounts on every change of photograph — that is what
              drives the cross-fade — so the arrows live on a stable wrapper
              outside it, or they would re-enter with each one. */}
          <div
            className="relative"
            role="group"
            aria-label="تصویرهای فرش"
            onKeyDown={(event) => {
              if (imageCount < 2) return;
              // RTL: the left arrow travels the way the gallery reads.
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                goToImage(currentImageIndex + 1);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                goToImage(currentImageIndex - 1);
              }
            }}
          >
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
              // Horizontal drag only, and framer-motion answers it with
              // `touch-action: pan-y`, so the page still scrolls under the
              // finger. A carousel that eats the vertical scroll is the
              // gesture conflict this would otherwise introduce.
              drag={imageCount > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              dragMomentum={false}
              onPointerDownCapture={(event) => {
                pointerStartX.current = event.clientX;
                swallowNextClick.current = false;
              }}
              onPointerUpCapture={(event) => {
                if (
                  pointerStartX.current !== null &&
                  Math.abs(event.clientX - pointerStartX.current) > 8
                ) {
                  swallowNextClick.current = true;
                }
              }}
              onClickCapture={(event) => {
                if (!swallowNextClick.current) return;
                // The lightbox listens on the photograph itself, below this
                // handler, so the native event has to be stopped too.
                event.preventDefault();
                event.stopPropagation();
                event.nativeEvent.stopImmediatePropagation();
              }}
              onDragEnd={(_, info) => {
                if (imageCount < 2) return;
                const travelled =
                  Math.abs(info.offset.x) > SWIPE_DISTANCE ||
                  Math.abs(info.velocity.x) > SWIPE_VELOCITY;
                if (!travelled) return;
                const forward = Math.sign(info.offset.x) === NEXT_DRAG_SIGN;
                goToImage(currentImageIndex + (forward ? 1 : -1));
              }}
              className={cn(
                "toranjan-zoom-frame relative aspect-4/5 w-full overflow-hidden rounded-xl border border-line bg-bg",
                imageCount > 1 && "touch-pan-y",
              )}
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

          {/* Pointer devices have no swipe. Hidden below `sm`, where the
              swipe is the gesture and an overlay this size would sit on the
              photograph instead of beside it — the dots still cover anyone
              on a phone who cannot swipe. */}
          {imageCount > 1 && (
            <>
              <button
                type="button"
                onClick={() => goToImage(currentImageIndex - 1)}
                aria-label="تصویر قبلی"
                // Inline-start — the right, in this page's direction. The
                // gallery reads right to left, so «back» is the side already
                // read and «next» is the side not yet reached.
                className="absolute start-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-2 bg-paper/85 text-ink-2 backdrop-blur-sm transition-colors duration-[--dur-feedback] hover:text-ink sm:grid"
              >
                <ChevronRight className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => goToImage(currentImageIndex + 1)}
                aria-label="تصویر بعدی"
                className="absolute end-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line-2 bg-paper/85 text-ink-2 backdrop-blur-sm transition-colors duration-[--dur-feedback] hover:text-ink sm:grid"
              >
                <ChevronRight className="size-5 rotate-180" />
              </button>
            </>
          )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {gallery.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToImage(index)}
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
                «buy now». Nobody buys a rug they have not seen on their floor.

                `w-full sm:flex-1`, never a bare `flex-1`. This row is a column
                on a phone, and `flex-1` there is `flex-basis: 0` on the
                *height*: the button collapsed to one line of text — 23px, half
                the §3-5 floor — while `h-13` sat in the class list doing
                nothing, because flex-basis wins over `height` on the main axis.
                It looked right on desktop, where the row is a row and the same
                declaration governs width. Reported from a phone.

                Gold rather than the near-black `--cta`, matching the heart. */}
            <Button
              size="lg"
              className={cn(
                // 53px, not `h-13`: the cart button beside it takes its height
                // from padding and a border and lands on 53, and these two are
                // meant to read as one row.
                "h-[53px] w-full gap-2 rounded-full text-[15px] sm:flex-1",
                arReady && "bg-accent text-accent-foreground hover:bg-accent-strong",
              )}
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
            {/* Same `w-full sm:flex-1` for the same reason. This one only ever
                looked right because the button inside is `w-full` and takes its
                height from padding, so the collapsing wrapper never showed. */}
            <div className="w-full sm:flex-1">
              <AddToCart
                // Out of stock is the one case where the button must not
                // pretend: the order endpoint would refuse the line anyway.
                key={selected?.id}
                onAdd={() => {
                  if (!selected || selected.stock <= 0) return;
                  addToCart({
                    variantId: selected.id,
                    carpetId: carpet.id,
                    carpetSlug: carpet.slug,
                    carpetName: carpet.name,
                    widthCm: selected.width_cm,
                    lengthCm: selected.length_cm,
                    unitPrice: selected.price,
                    imageUrl: carpet.images.find((i) => i.is_primary)?.url ?? null,
                  });
                }}
              />
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
