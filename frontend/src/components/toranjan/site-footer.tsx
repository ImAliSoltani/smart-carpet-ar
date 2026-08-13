import Link from "next/link";

import { ReplayIntro } from "@/components/toranjan/intro/replay-intro";
import { contactChannels } from "@/lib/content/contact";

/**
 * The footer.
 *
 * Hand-built on purpose — the roadmap's component budget says so outright, and
 * a footer is a list of links in a box: there is no interaction here worth
 * importing.
 *
 * **It links only to pages that exist.** That rule wrote the first version of
 * this file, when `/about`, `/contact` and `/faq` were §6-12 and unbuilt. They
 * are built now, so they are here, in a column of their own: they answer a
 * different question from «where are the carpets», and a single list of seven
 * links makes the visitor read all seven to find out which.
 *
 * The WhatsApp and Instagram links §6-12 asks for are still accounts the shop
 * does not have. They now come from `lib/content/contact.ts` — the same empty
 * constants the contact page reads — so the day they exist, this footer and
 * that page fill in together instead of one of them being forgotten.
 */

const SHOP_LINKS = [
  { href: "/carpets", label: "همه‌ی فرش‌ها" },
  { href: "/favourites", label: "علاقه‌مندی‌ها" },
  // The comparison's only fixed door. Its tray appears when there is something
  // in it, and the header has no room for a fifth tool — measured, not felt; the
  // note above `FLAT_LINKS` in the header records the 1024 overflow. So this is
  // the one way to reach the page with an empty shortlist, which is what makes
  // the empty state worth having written.
  { href: "/compare", label: "مقایسه‌ی فرش‌ها" },
  { href: "/cart", label: "سبد خرید" },
  { href: "/track", label: "پیگیری سفارش" },
];

const ABOUT_LINKS = [
  { href: "/about", label: "درباره‌ی ترنجان" },
  { href: "/faq", label: "سؤال‌های پرتکرار" },
  { href: "/contact", label: "تماس" },
];

export function SiteFooter() {
  const socials = contactChannels();

  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <p className="text-xl font-light tracking-tight">ترنجان</p>
            <p className="mt-3 text-[13px] leading-loose text-muted">
              فرش دستباف و ماشینی، با امکان دیدن هر فرش با ابعاد واقعی روی کف خانه‌ی
              خودتان — پیش از خرید، داخل مرورگر، بدون نصب هیچ برنامه‌ای.
            </p>
          </div>

          <div className="flex gap-10 sm:gap-16">
            <nav aria-label="پیوندهای فروشگاه">
              <p className="mb-1 text-[11px] tracking-[0.18em] text-muted">فروشگاه</p>
              <ul>
                {SHOP_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex h-11 items-center text-[13.5px] text-ink-2 transition-colors duration-[--dur-feedback] hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="درباره و راهنما">
              <p className="mb-1 text-[11px] tracking-[0.18em] text-muted">راهنما</p>
              <ul>
                {ABOUT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex h-11 items-center text-[13.5px] text-ink-2 transition-colors duration-[--dur-feedback] hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {socials.length > 0 && (
          <ul className="mt-8 flex gap-5">
            {socials.map((channel) => (
              <li key={channel.id}>
                <a
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center text-[13px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
                >
                  {channel.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-loose text-muted">
            ترنجان — پروژه‌ی پایانی کارشناسی. کاتالوگ این نسخه برای نمایش و ارزیابی سامانه
            است، نه فروش.
          </p>
          {/* The end of the shop is where this belongs: somebody who has reached
              the bottom of the page has already been given everything else, and
              the entrance is the one thing on the site with no other door to
              it. */}
          <ReplayIntro className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full border border-line-2 px-4 text-[12.5px] text-muted transition-colors duration-[--dur-feedback] hover:border-line hover:text-ink sm:self-auto" />
        </div>
      </div>
    </footer>
  );
}
