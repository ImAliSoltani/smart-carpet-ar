import { CompareReveal } from "@/components/ui/compare-reveal";
import { Cta } from "@/components/ui/hero-10-utils/cta";
// Imported rather than referenced by path, for the reason `brand/README.md`
// gives: `next/image` fingerprints a static import by its contents, so
// replacing a photograph changes its URL and no browser can serve yesterday's
// copy. The imports are used for their `.src` here rather than through
// `next/image` — see `RoomPicture` — but the fingerprint is the same one.
import roomTallAfter from "../../../public/brand/room-tall-after.webp";
import roomTallBefore from "../../../public/brand/room-tall-before.webp";
import roomWideAfter from "../../../public/brand/room-wide-after.webp";
import roomWideBefore from "../../../public/brand/room-wide-before.webp";

/**
 * The front door.
 *
 * It replaces a hero that said the shop's claim and a feature grid that said it
 * again, neither of which *showed* it. «فرش را با ابعاد واقعی روی کف خانه‌ی
 * خودتان ببینید» is a sentence any carpet shop can write; the sentence is worth
 * nothing until the visitor has watched a carpet arrive on a floor. So the
 * first thing on this page is a picture of an empty room that the visitor
 * themselves turns into a furnished one, and the control demonstrates itself
 * once before they touch it.
 *
 * **The demonstration is not the feature, and the copy says so.** Dragging a
 * divider across two photographs of somebody else's living room is not
 * augmented reality and must not be dressed as it — the second line names the
 * camera and «خانه‌ی خودتان» precisely so nobody mistakes the two.
 *
 * **Why `<picture>` and not `next/image`.** These are two art-directed pairs,
 * not one image at two sizes: the landscape room and the portrait room are
 * different photographs, framed differently, and `next/image` has no way to
 * swap sources at a breakpoint. A `<picture>` with one `media` query downloads
 * exactly one pair — about 195KB — where rendering both and hiding one with
 * `lg:hidden` would fetch all four. The sources are already 4:5 and 3:2 WebP at
 * the sizes they are drawn, so there is nothing for the optimiser to do.
 *
 * The breakpoint here and the `lg:` in the frame's aspect ratio are the same
 * 1024px on purpose. If one moves, the other has to move with it, or the frame
 * will be shaped for a photograph the browser did not load.
 */

function RoomPicture({
  wide,
  tall,
  alt,
}: Readonly<{
  wide: { src: string; width: number; height: number };
  tall: { src: string; width: number; height: number };
  alt: string;
}>) {
  return (
    // `contents`, so the <img> is laid out by the absolutely-positioned frame
    // above it. A <picture> box in between would be an inline element of its
    // own height and the image would not fill the frame.
    <picture className="contents">
      <source media="(min-width: 1024px)" srcSet={wide.src} width={wide.width} height={wide.height} />
      <img
        src={tall.src}
        alt={alt}
        width={tall.width}
        height={tall.height}
        draggable={false}
        // Both halves are on screen from the first paint, so both are the LCP
        // candidate and neither can wait for the lazy queue.
        loading="eager"
        fetchPriority="high"
        // Anchored to the bottom: the cap on the frame's height crops the wall
        // and the ceiling, which cost nothing. Cropping from the other end
        // would take the carpet, which is the entire point of the picture.
        className="h-full w-full object-cover object-bottom"
      />
    </picture>
  );
}

export function HomeHero() {
  return (
    <section className="relative isolate border-b border-line">
      <div className="mx-auto max-w-3xl px-5 pt-6 pb-4 text-center sm:px-8 sm:pt-10 sm:pb-6">
        <h1 className="text-[28px] leading-[1.35] font-bold tracking-tight text-balance text-ink sm:text-4xl">
          فرش را روی کف خانه‌ی خودتان ببینید،
          <br />
          <span className="text-accent">با ابعاد واقعی</span>
        </h1>
        <p className="mt-3 text-[15px] leading-loose text-balance text-muted sm:mt-4 sm:text-base">
          دستگیره را بکشید. در فروشگاه، همین کار را با دوربین گوشی روی کف خانه‌ی
          خودتان می‌کنید.
        </p>

        {/* Above the picture rather than below it, and the reason is the fold.
            A landscape photograph wide enough to be a front door is 500-odd
            pixels tall on a laptop; with the buttons underneath, the fold falls
            between the two and the shop's one link is never seen without a
            scroll. Read in order — claim, explanation, way in, proof — this is
            also the sentence the page wanted to say anyway. */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:mt-6">
          <Cta cta={{ ctaEnabled: true, text: "ورود به فروشگاه", link: "/carpets" }} />
          <Cta cta={{ ctaEnabled: true, text: "پیگیری سفارش", link: "/track", variant: "outline" }} />
        </div>
      </div>

      {/* Full-bleed: the frame is a direct child of the section, so it spans the
          viewport rather than the page's text column. */}
      <CompareReveal
        // The caps are what keep the carpet on screen. Left to its own aspect
        // ratio the landscape frame is 859px tall at 1280 wide, which puts the
        // bottom of the picture — the carpet — below the fold on any laptop.
        // The cap crops from the top instead (see `object-bottom`), and is
        // written as «the viewport minus this page's own chrome» so it tracks
        // the header, the headline and the buttons rather than a guess.
        //
        // The phone number is larger than the desktop one by roughly the height
        // of the bottom bar. That bar is `fixed`: it does not take the space it
        // occupies, so a frame sized to the viewport ends up with its last 84px
        // — the near edge of the carpet and its fringe — underneath it.
        className="aspect-[29/36] max-h-[calc(100svh-30rem)] min-h-[260px] lg:aspect-[79/53] lg:max-h-[calc(100svh-25rem)]"
        aria-label="مقایسه‌ی یک اتاق، بدون فرش و با فرش"
        labels={["بدون فرش", "با فرش"]}
        before={
          <RoomPicture
            wide={roomWideBefore}
            tall={roomTallBefore}
            alt="اتاق نشیمنی با کف چوبی روشن، بدون فرش"
          />
        }
        after={
          <RoomPicture
            wide={roomWideAfter}
            tall={roomTallAfter}
            alt="همان اتاق، با یک فرش دستباف لچک‌ترنج قرمز روی کف"
          />
        }
      />
    </section>
  );
}
