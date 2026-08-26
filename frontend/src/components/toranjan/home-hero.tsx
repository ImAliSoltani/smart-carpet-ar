import { CompareReveal } from "@/components/ui/compare-reveal";
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
 * **It is a framed photograph, not a bleed.** Edge to edge, the frame is as
 * wide as the window and its height is therefore the window's width over the
 * photograph's ratio — 916px at 1366 — against the 368px the page had left
 * above the fold. `object-cover` closed that gap by throwing away 548 of those
 * 916 pixels, and because the crop is anchored at the bottom, what it threw
 * away was the room: the sofa, the window, the plant, everything that makes the
 * carpet's arrival mean anything. What was left was a floor.
 *
 * So the picture now sits in the same column as the rest of the page, with the
 * same gutters, rounded and raised off the paper. Bounded to that column its
 * height is the column's width over the ratio, which is a number this page can
 * afford, and the wide crop is chosen rather than inherited: 2.7:1 is the band
 * from above the sofa to the near fringe of the carpet, with the empty ceiling
 * and the empty foreground taken off both ends instead of the room taken off
 * one. `object-position` is a percentage on purpose — the band stays exactly
 * the same at every desktop width, because both terms of the ratio scale with
 * the column.
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
        // The portrait room is drawn at its own ratio and is not cropped at
        // all until the window is short, and then from the top: its upper
        // two-fifths are bare wall. The landscape one is a band taken out of
        // the middle — 85% down the overflow — because there the top is where
        // the sofa is.
        className="h-full w-full object-cover object-bottom lg:object-[50%_85%]"
      />
    </picture>
  );
}

export function HomeHero() {
  return (
    // No rule under it any more: the showcase's own heading draws one across
    // the same column a few rem below, and two lines with a section of air
    // between them read as a mistake.
    <section className="relative isolate pb-10 sm:pb-14">
      <div className="mx-auto max-w-3xl px-5 pt-6 pb-5 text-center sm:px-8 sm:pt-10 sm:pb-7">
        <h1 className="text-[28px] leading-[1.35] font-bold tracking-tight text-balance text-ink sm:text-4xl">
          فرش را روی کف خانه‌ی خودتان ببینید،
          <br />
          <span className="text-accent">با ابعاد واقعی</span>
        </h1>
        <p className="mt-3 text-[15px] leading-loose text-balance text-muted sm:mt-4 sm:text-base">
          دستگیره را بکشید. در فروشگاه، همین کار را با دوربین گوشی روی کف خانه‌ی
          خودتان می‌کنید.
        </p>

      </div>

      {/* The same column, the same gutters and the same rhythm as every other
          section of this page — which is the point. The way in used to sit here
          as two buttons, above the picture, so that the fold would not swallow
          them; they are now under the showcase, where the visitor arrives
          having already been shown what the shop is for. */}
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <CompareReveal
          // Bounded by the column, so the height follows from the ratio and the
          // caps are only a floor-plan for very short windows: 21rem is this
          // page's chrome on a phone plus the bottom bar it does not reserve
          // space for, 19rem the same sum on a desktop, which has neither the
          // bar nor the taller headline.
          className="aspect-[29/36] max-h-[calc(100svh-21rem)] min-h-[260px] rounded-2xl shadow-raised lg:aspect-[27/10] lg:max-h-[calc(100svh-19rem)]"
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
      </div>
    </section>
  );
}
