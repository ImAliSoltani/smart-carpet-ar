import Link from "next/link";

/**
 * The footer.
 *
 * Hand-built on purpose — the roadmap's component budget says so outright, and
 * a footer is a list of links in a box: there is no interaction here worth
 * importing.
 *
 * **It links only to pages that exist.** `/about`, `/contact` and `/faq` are
 * §6-12 and are not built; a footer full of dead links is worse than a short
 * one, and it is the kind of thing nobody notices until a visitor does.
 *
 * The WhatsApp and Instagram links §6-12 asks for are real accounts the shop
 * does not have yet, so they are one empty constant here rather than a
 * plausible-looking URL. Filling them in is a one-line change; inventing them
 * would put a broken promise on every page of the site.
 */

const SOCIAL = {
  whatsapp: "",
  instagram: "",
} as const;

const SHOP_LINKS = [
  { href: "/carpets", label: "همه‌ی فرش‌ها" },
  { href: "/favourites", label: "علاقه‌مندی‌ها" },
  { href: "/cart", label: "سبد خرید" },
  { href: "/track", label: "پیگیری سفارش" },
];

export function SiteFooter() {
  const socials = Object.entries(SOCIAL).filter(([, href]) => href);

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

          <nav aria-label="پیوندهای فروشگاه">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-1 sm:grid-cols-1">
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
        </div>

        {socials.length > 0 && (
          <ul className="mt-8 flex gap-5">
            {socials.map(([name, href]) => (
              <li key={name}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ltr-isolate flex h-11 items-center text-[13px] uppercase tracking-widest text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 border-t border-line pt-6 text-[12px] leading-loose text-muted">
          ترنجان — پروژه‌ی پایانی کارشناسی. کاتالوگ این نسخه برای نمایش و ارزیابی سامانه
          است، نه فروش.
        </p>
      </div>
    </footer>
  );
}
