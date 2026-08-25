import type { Metadata } from "next";
import Link from "next/link";

import { HomeFeatured } from "@/components/toranjan/home-featured";
import { HomeHero } from "@/components/toranjan/home-hero";
import { HomePromise } from "@/components/toranjan/home-promise";
import { HomeShowcase } from "@/components/toranjan/home-showcase";
import { NAV_ROOMS, ROOM_LABEL } from "@/lib/taxonomy";

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

      <HomeFeatured
        title="تازه‌ترین‌ها"
        note="آخرین فرش‌هایی که به کاتالوگ اضافه شده‌اند."
        filters={{ sort: "newest" }}
      />

      <HomePromise />

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

    </main>
  );
}
