import type { Metadata } from "next";
import Link from "next/link";

import { Hero10 } from "@/components/ui/hero-10";
import { HomeFeatured } from "@/components/toranjan/home-featured";
import { HomePromise } from "@/components/toranjan/home-promise";
import { NAV_ROOMS, ROOM_LABEL } from "@/lib/taxonomy";

export const metadata: Metadata = {
  title: "ترنجان — فرش را پیش از خرید در خانه‌ی خودت ببین",
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
        images={["/brand/hero-1.webp", "/brand/hero-2.webp", "/brand/hero-3.webp"]}
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
        sort="newest"
      />

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <h2 className="mb-8 border-t border-line pt-8 text-xl font-light tracking-tight sm:text-2xl">
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

      <HomeFeatured
        title="ارزان‌ترین‌ها"
        note="اگر بودجه‌ی مشخصی دارید، از اینجا شروع کنید."
        sort="price_asc"
      />
    </main>
  );
}
