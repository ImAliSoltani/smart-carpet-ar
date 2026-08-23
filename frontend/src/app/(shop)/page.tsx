import type { Metadata } from "next";
import Link from "next/link";

import { Hero10 } from "@/components/ui/hero-10";
// Imported rather than referenced by path. `next/image` fingerprints a static
// import by its contents, so replacing a photograph changes its URL and no
// browser can serve yesterday's copy — which is exactly what happened while
// the names stayed `/brand/hero-1.webp`. Swapping the file is still the whole
// procedure; the hash follows it.
import hero1 from "../../../public/brand/hero-1.webp";
import hero2 from "../../../public/brand/hero-2.webp";
import hero3 from "../../../public/brand/hero-3.webp";
import { HomeFeatured } from "@/components/toranjan/home-featured";
import { HomePromise } from "@/components/toranjan/home-promise";
import { NAV_ROOMS, ROOM_LABEL } from "@/lib/taxonomy";

export const metadata: Metadata = {
  title: { absolute: "ترنجان — فرش را پیش از خرید در خانه‌ی خودتان ببینید" },
  description:
    "فروشگاه فرش دستباف و ماشینی. هر فرش را با ابعاد واقعی روی کف خانه‌ی خودتان ببینید، شبیهش را با یک عکس پیدا کنید، و اندازه‌ی مناسب اتاق را بگیرید.",
};

/**
 * The home page.
 *
 * Its order is the argument, and the order changed on purpose. `brand-brief`
 * §5 had the cinematic entrance dissolve straight into the product grid —
 * «ورودی تحویل نمی‌دهد به فروشگاه؛ خودش تبدیل به فروشگاه می‌شود». That reads
 * beautifully and leaves the shop's whole claim unsaid: a grid of seventy
 * cards cannot tell anyone they may stand a carpet on their own floor at its
 * real size, and a visitor who never learns that has been shown an ordinary
 * carpet shop.
 *
 * So the entrance now lands here instead, and this page says the thing first:
 * the promise, then the invitation into the shop, then carpets. The entrance
 * is still built last (ROADMAP), and where it meets this page — the wordmark
 * settling on the dark carpet before the light page rises over it — is the
 * seam to build then, not now.
 */
export default function HomePage() {
  return (
    <main>
      <HomePromise />

      <Hero10
        title="فرش ایرانی،"
        titleLine2Prefix="با"
        titleHighlight="اندازه‌ی واقعی"
        description="بین فرش‌های دستباف و ماشینی بگردید، و هرکدام را پیش از خرید با ابعاد دقیق روی کف خانه‌ی خودتان بگذارید."
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

      {/* Deliberately not `toranjan-rise`. That class animates on load, and
          everything on this page below the fold is behind the cinematic intro
          while it plays — the entrance would run, finish, and be over before
          the visitor ever saw this section. Below the fold wants a scroll
          trigger, which is what the carpet card already uses. */}
      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <h2 className="mb-8 border-t border-line pt-8 text-xl font-bold tracking-tight sm:text-2xl">
          برای کدام اتاق؟
        </h2>
        {/* Rooms rather than patterns: someone arriving at a carpet shop knows
            which room is empty long before they know what a lachak-toranj is.
            The pattern names are in the header's menu, for whoever does. */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {NAV_ROOMS.map((room) => (
            <li key={room}>
              <Link
                href={`/carpets?room=${room}`}
                className="flex h-24 items-center justify-center rounded-xl border border-line bg-paper text-[15px] shadow-panel transition-colors duration-[--dur-feedback] hover:border-line-2 hover:text-accent"
              >
                {ROOM_LABEL[room]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Not «the cheapest». A shop that opens its front page with a bargain
          bin has told the visitor what it thinks of its own carpets — and this
          one's argument is craft, not price. Silk is the other end of the same
          catalogue and needs no apology. */}
      <HomeFeatured
        title="ابریشم دستباف"
        note="ظریف‌ترین بافت‌های کاتالوگ."
        filters={{ material: ["silk"], sort: "price_desc" }}
        href="/carpets?material=silk"
      />
    </main>
  );
}
