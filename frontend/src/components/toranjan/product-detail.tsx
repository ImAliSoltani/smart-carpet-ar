"use client";

import * as React from "react";
import { ViewTransition } from "react";
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

import { ACTION_LABEL, AddToCart } from "@/components/toranjan/add-to-cart";
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
import { CARPET_PHOTO_CLASS, carpetPhotoName } from "@/lib/view-transition";

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

  // The large derivative for both, and this is the debt the roadmap logged as
  // «the real srcset still does not use `full_url`».
  //
  // The page used the card file, whose long edge is capped at 800 — so a
  // portrait carpet arrived 461px wide for a slot measured at 582 CSS px, and
  // 1164 on a retina screen. `next/image` cannot invent detail it was not
  // given: the browser asked the srcset for a 750px variant and was handed 398
  // real pixels. `full_url` is the same photograph at 730x1268 — 58% more width
  // on the two measured here.
  //
  // It costs nothing to the phone. `sizes` still decides which variant is
  // fetched, so a small screen gets a small file either way; the source only
  // sets the ceiling, and the ceiling was the problem.
  //
  // `full_url` is null on rows ingested before the derivative columns existed,
  // and there the card file stands in — soft is worse than sharp and far better
  // than a 404.
  // The styled photograph leads and the flat one follows it, which is the order
  // the grid already promised: a card rests on the room shot, so opening it has
  // to arrive at the room shot or the shared transition dissolves one
  // photograph into a different one. Everything after the pair keeps the order
  // the ingest gave it.
  //
  // Read off `is_primary` rather than off position, because that flag is the
  // one thing guaranteed to mean «the flat» — it is what the AR pipeline
  // rectifies and what visual search embeds, and it is set that way whether the
  // carpet came from `ingest_catalog.py` or from an upload in the admin panel.
  const gallery = React.useMemo(() => {
    const images = carpet.images;
    const flat = images.findIndex((image) => image.is_primary);
    const cover = images.findIndex((image) => !image.is_primary);
    const ordered =
      flat < 0 || cover < 0
        ? images
        : [
            images[cover],
            images[flat],
            ...images.filter((_, i) => i !== cover && i !== flat),
          ];
    return ordered
      .map((image) => ({
        src: mediaUrl(image.full_url ?? image.url),
        zoomSrc: mediaUrl(image.full_url ?? image.url),
      }))
      .filter((entry): entry is { src: string; zoomSrc: string } => Boolean(entry.src));
  }, [carpet.images]);

  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  // −1 or +1: which way the reader is turning, so the photograph arrives from
  // the side they are turning from instead of materialising in place.
  const [direction, setDirection] = React.useState(0);

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
      // Direction comes from the index as asked for, *before* it is wrapped —
      // which is what makes the wrap look right. Stepping past the last
      // photograph asks for index `imageCount`, still greater than the current
      // one, so it reads as going forward even though it lands on zero. Compare
      // the wrapped values instead and the last step of a loop plays backwards.
      setDirection(index > currentImageIndex ? 1 : index < currentImageIndex ? -1 : 0);
      // wraps both ways, so the last photograph leads back to the first
      setCurrentImageIndex(((index % imageCount) + imageCount) % imageCount);
    },
    [imageCount, currentImageIndex],
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
      {/* The two crumbs are 44px of press area around type that has not moved:
          `min-h-11` on the links, and the row's bottom margin pulled in to give
          most of the added height back. They were 20px tall. */}
      <nav aria-label="مسیر" className="-mx-2 mb-1 flex items-center pt-8 text-sm text-muted">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center px-2 transition-colors duration-[--dur-feedback] hover:text-ink"
        >
          ترنجان
        </Link>
        <ChevronRight className="size-4 rotate-180" />
        <Link
          href="/carpets"
          className="inline-flex min-h-11 items-center px-2 transition-colors duration-[--dur-feedback] hover:text-ink"
        >
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
          {/* The other half of the shared transition. Named from the slug, so
              the frame the visitor pressed in the grid is the frame that grows
              into this one — the card and this page never learn about each
              other, they only agree on the carpet.

              Wrapped around `AnimatePresence` rather than inside it: the
              cross-fade needs its `motion.div` as a direct child to see it
              leave, and an element between the two makes every change of
              photograph an unmount it cannot animate. React looks through
              `AnimatePresence` for the frame either way, since it renders its
              child with no element of its own. */}
          <ViewTransition name={carpetPhotoName(carpet.slug)} default={CARPET_PHOTO_CLASS}>
            {/* The frame holds still and the photographs travel through it.
                They used to be the same element, which is why changing image
                read as one picture dissolving in mid-air: the thing that moved
                was the whole frame, so the only change it could express was
                opacity. Now the border, the rounding and the box stay put —
                they are what the shared transition grows into — and the layer
                inside slides. */}
            <div
              className={cn(
                "toranjan-zoom-frame relative aspect-4/5 w-full overflow-hidden rounded-xl border border-line bg-bg",
                imageCount > 1 && "touch-pan-y",
              )}
            >
              {/* `initial={false}`, and it has to live here rather than on the
                  child. `useReducedMotion` answers differently on the server
                  than in the browser, and a branch on it once rendered
                  `opacity: 0` into the HTML and `opacity: 1` after hydration —
                  a real mismatch React refuses to patch up. Told here, the
                  first photograph mounts already at rest and the enter
                  animation only ever runs on a photograph the reader asked
                  for. No `mode`: both layers have to move at once, or the
                  outgoing one leaves an empty frame behind before the next
                  arrives. */}
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentImageIndex}
                  custom={direction}
                  // Right-to-left, so photograph two sits to the *left* of
                  // photograph one and turning forward walks the strip
                  // rightwards: the new one comes in from the left edge while
                  // the old one leaves by the right. Turning back mirrors it.
                  // Same sign convention as the drag below, and the reason the
                  // arrows and the arrow keys are flipped from an LTR carousel.
                  variants={{
                    enter: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  // Duration carries reduced motion rather than a different set
                  // of values, so the styles React renders never depend on a
                  // hook that disagrees with itself across hydration. At zero
                  // the slide is a swap, which is what «less motion» means.
                  transition={{
                    duration: reduced ? 0 : 0.42,
                    ease: [0.16, 1, 0.3, 1],
                    opacity: { duration: reduced ? 0 : 0.28 },
                  }}
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
                  className="absolute inset-0"
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
            </div>
          </ViewTransition>

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

          {/* Wraps rather than overflows: the widest carpet in the catalogue
              has seven images, and seven dots beside «فرش‌های مشابه» do not fit
              375px on one line. */}
          <div className="flex flex-wrap items-center justify-between gap-y-3">
            {/* The dots keep their 8px and the press area around them does not:
                §3-5's floor is on what a thumb has to hit, not on what gets
                drawn — the trade `corner-toggle` already made.
                **Height is the full 44; width is 24.** Seven targets 44 wide
                would be 308px of dots, which is why the row above has to wrap,
                and a row of dots spaced 44px apart stops reading as one
                control. 24px with no gap is the spacing rule instead: no two
                press areas overlap, the gallery also swipes, and the arrows
                and the photograph itself reach the same images.
                `-mx-2` puts the row back where the bare dots used to sit. */}
            <div className="-mx-2 flex">
              {gallery.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToImage(index)}
                  className="grid h-11 place-items-center px-2"
                  aria-label={`تصویر ${formatNumber(index + 1)}`}
                  aria-current={currentImageIndex === index}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "block h-2 rounded-full transition-all duration-300",
                      currentImageIndex === index ? "w-5 bg-ink" : "w-2 bg-ink/25 hover:bg-ink/40",
                    )}
                  />
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              // `h-11`: `size="sm"` is 36px and this is a real action, not a
              // caption.
              className="h-11 gap-2 rounded-full border-line-2"
              asChild
            >
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
                        // `h-11` rather than the padding's 42px. Two pixels is
                        // nothing to look at and still under the floor, and
                        // choosing a size is the one thing this column exists
                        // for.
                        "h-11 rounded-md border px-4 text-sm transition-colors duration-[--dur-feedback]",
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

                Gold rather than the near-black `--cta`, matching the heart.

                Everything about the box is matched to the cart button beside
                it, because on a phone they stack and any difference reads as a
                mistake: 53px tall, `rounded-full`, 15px/500, a 1px border (the
                cart has one, so without it the two content boxes differ), 18px
                icon, 10px gap, 24px padding.

                That leaves the labels, which are not the same length — and with
                centred content, unequal labels put the two icons at different
                x. Hence `ACTION_LABEL`: a shared minimum width on the label of
                *both* buttons, so the icon-and-label block is one size and
                centres to one place. A minimum rather than a fixed width, so a
                longer string still fits instead of spilling. */}
            <Button
              size="lg"
              className={cn(
                // 53px, not `h-13`: the cart button beside it takes its height
                // from padding and a border and lands on 53, and these two are
                // meant to read as one row.
                "h-[53px] w-full gap-2.5 rounded-full border px-6 text-[15px] sm:flex-1",
                arReady
                  ? "border-accent bg-accent text-accent-foreground hover:border-accent-strong hover:bg-accent-strong"
                  : "border-transparent",
              )}
              disabled={!arReady}
              asChild={arReady}
            >
              {arReady ? (
                <Link href={`/carpets/${carpet.slug}/ar?variant=${selected?.id}`}>
                  <Cuboid className="size-[18px]" />
                  <span className={ACTION_LABEL}>در خانه‌ی من ببین</span>
                </Link>
              ) : (
                <span>
                  <Cuboid className="size-[18px]" />
                  <span className={ACTION_LABEL}>فایل واقعیت افزوده هنوز آماده نیست</span>
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
                // It used to be enforced only by the early return below, which
                // meant the button still played its confirmation over a cart
                // nothing had been added to — see the note on `disabled`.
                key={selected?.id}
                disabled={!selected || selected.stock <= 0}
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
