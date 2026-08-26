import type { Metadata } from "next";

import { HomeFeatured } from "@/components/toranjan/home-featured";
import { HomeHero } from "@/components/toranjan/home-hero";
import { HomePromise } from "@/components/toranjan/home-promise";
import { HomeRooms } from "@/components/toranjan/home-rooms";
import { HomeShowcase } from "@/components/toranjan/home-showcase";
import { Hero10 } from "@/components/ui/hero-10";
// Imported rather than referenced by path. `next/image` fingerprints a static
// import by its contents, so replacing a photograph changes its URL and no
// browser can serve yesterday's copy — which is exactly what happened while
// the names stayed `/brand/hero-1.webp`. Swapping the file is still the whole
// procedure; the hash follows it.
import hero1 from "../../../public/brand/hero-1.webp";
import hero2 from "../../../public/brand/hero-2.webp";
import hero3 from "../../../public/brand/hero-3.webp";

export const metadata: Metadata = {
  title: { absolute: "ترنجان — فرش را پیش از خرید در خانه‌ی خودتان ببینید" },
  description:
    "فروشگاه فرش دستباف و ماشینی. هر فرش را با ابعاد واقعی روی کف خانه‌ی خودتان ببینید، شبیهش را با یک عکس پیدا کنید، و اندازه‌ی مناسب اتاق را بگیرید.",
};

/**
 * The home page.
 *
 * Its order is the argument, and the order has now changed twice.
 *
 * `brand-brief` §5 first had the cinematic entrance dissolve straight into the
 * product grid. That left the shop's whole claim unsaid, so the entrance was
 * made to land here instead and this page opened by *stating* the claim: a
 * four-card feature grid, then a hero of text with three small photographs
 * beside it.
 *
 * Stating it was still not enough. «فرش را با ابعاد واقعی روی کف خانه‌ی خودتان
 * ببینید» is a sentence any carpet shop can write, and a visitor who reads it
 * above four icons has been given a promise, not a reason to believe one. Worse,
 * the largest thing above the fold was a paragraph — on a page whose own brand
 * brief says the photograph of the carpet must be the loudest element of every
 * screen.
 *
 * So the claim is now *performed* first and explained afterwards: the entrance
 * lands on a room the visitor furnishes with their own hand, and only then do
 * the carpets, the other three features, and the rooms follow. The feature grid
 * did not go away — it moved to where an explanation belongs, which is after
 * the thing it explains.
 *
 * **And the order moved once more, by the smallest amount.** Performing the
 * claim first was right; putting the shop's two links *above* the performance
 * was the price paid for it, and it was paid to the fold — a full-bleed
 * photograph is tall enough to push anything under it off a laptop screen. The
 * picture is no longer full-bleed (see `HomeHero`), so the price no longer has
 * to be paid: the links moved down to the fan, which is where they were before
 * any of this, and the top of the page is now the claim, its one sentence, and
 * the proof — with nothing between them.
 *
 * The showcase took the silk row's place rather than joining it. That row was
 * «ظریف‌ترین بافت‌های کاتالوگ» as four small cards at the bottom of the page, and
 * the catalogue holds exactly two silk carpets — a rail of two, below
 * everything else, arguing for the most expensive things in the shop. The
 * showcase makes the same argument at the top, one carpet at a time, with the
 * shop's own words about each weave and the carpet's colour behind it.
 */
export default function HomePage() {
  return (
    <main>
      <HomeHero />

      <HomeShowcase />

      {/* The fan comes back, and it comes back *here*.

          It was the front door until the demonstration took that job, and it
          was removed with it — but what went with it were the shop's two links,
          which had been folded into the hero above the picture ever since. A
          way in belongs after the argument for going in, not before it: the
          visitor has now dragged a carpet onto a floor and been shown four of
          them one at a time, and this is the first moment the invitation
          answers something they were already thinking.

          `compact` and an `h2`. The page has a first heading and it is the one
          at the top; a second `h1` two screens down is a document claiming to
          begin twice, and a title larger than the one it sits under reads as
          the page changing its mind about what it is called. */}
      <Hero10
        titleAs="h2"
        variant="compact"
        title="بقیه‌ی کاتالوگ هم"
        titleHighlight="همین‌جاست"
        description="دستباف و ماشینی، از قم و کاشان و اراک تا فرش‌های ساده‌ی هر روز — هرکدام را می‌توانید پیش از خرید روی کف خانه‌ی خودتان بگذارید."
        images={[hero1, hero2, hero3]}
        imageAlts={[
          "فرش دستباف ایرانی با نقش لچک‌ترنج",
          "فرش پهن‌شده در اتاقی روشن",
          "نمای نزدیک از بافت و حاشیه‌ی فرش",
        ]}
        primaryCTA={{ ctaEnabled: true, text: "ورود به فروشگاه", link: "/carpets" }}
        secondaryCTA={{ ctaEnabled: true, text: "پیگیری سفارش", link: "/track" }}
      />

      <HomeFeatured
        title="تازه‌ترین‌ها"
        note="آخرین فرش‌هایی که به کاتالوگ اضافه شده‌اند."
        filters={{ sort: "newest" }}
      />

      <HomePromise />

      <HomeRooms />
    </main>
  );
}
