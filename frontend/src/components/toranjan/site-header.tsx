"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCartCount } from "@/lib/store/cart";
import { Heart, Menu, Search, ShoppingBag } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { carpetListQuery } from "@/lib/api/catalog";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import {
  MATERIAL_LABEL,
  NAV_MATERIALS,
  NAV_PATTERNS,
  NAV_ROOMS,
  PATTERN_LABEL,
  ROOM_LABEL,
} from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The site header.
 *
 * Built on the shop navigation menu from 21st.dev, which supplied the shape:
 * two dropdown panels — one wide, with a featured image, one a plain grid —
 * beside a couple of flat links.
 *
 * What it did not supply, and had to be built: the header itself. The catalogue
 * component is only the menu; there is no brand, no tools, and although it
 * imports a Sheet and a menu icon it never renders them, so the mobile drawer
 * is assembled here from the Sheet primitive that came in the same bundle.
 *
 * There is no search field. The roadmap puts Persian text search on the list
 * page (§6-2), next to the filters it narrows, and the shop is browsed by
 * pattern rather than by name — few visitors know a rug's title before they
 * have seen it. The magnifier is a route to that page, not a field of its own.
 */

/**
 * The features that help a visitor choose, grouped under one heading.
 *
 * Grouped rather than listed flat because each one needs a sentence before it
 * means anything — «راهنمای اندازه» does not explain itself in the way
 * «درباره‌ی ما» does. Keeping them together also stops the desktop menu and the
 * mobile drawer from drifting apart, which they had: the drawer offered all
 * three and the menu bar only one.
 */
const HELP_LINKS = [
  {
    href: "/visual-search",
    label: "جست‌وجوی بصری",
    note: "عکس یک فرش را بدهید تا شبیه‌هایش را پیدا کنیم.",
  },
  {
    href: "/room-adviser",
    label: "مشاور چیدمان",
    note: "عکس اتاق را بدهید تا بگوییم چه فرشی به آن می‌آید.",
  },
  {
    href: "/size-guide",
    label: "راهنمای اندازه",
    note: "از روی عکس اتاق، اندازه‌ی مناسب را پیشنهاد می‌دهیم.",
  },
];

/**
 * The entries that are a link and nothing more.
 *
 * Two on the bar, four in the drawer, and the difference is a measurement
 * rather than an oversight. A third flat link was tried and taken out again:
 * at 1024 the bar's four children want 1047px of 1009, and the site scrolls
 * sideways — the same failure the wordmark was stacked to fix. The drawer has a
 * vertical axis and no such budget, so it carries the questions page and the
 * contact page too.
 *
 * Both lists are declared here rather than inline, because the bar and the
 * drawer have drifted apart once already — the drawer offered all three help
 * links while the bar offered one — and that is the shape of mistake that only
 * shows up on the device you are not testing on.
 */
const FLAT_LINKS = [
  { href: "/track", label: "پیگیری سفارش" },
  { href: "/about", label: "درباره‌ی ما" },
];

const DRAWER_LINKS = [
  { href: "/track", label: "پیگیری سفارش" },
  { href: "/faq", label: "سؤال‌های پرتکرار" },
  { href: "/about", label: "درباره‌ی ما" },
  { href: "/contact", label: "تماس" },
];

function useScrolled() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    let ticking = false;
    const apply = () => {
      setScrolled(window.scrollY > 24);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

/**
 * The rug that stands in the wide panel.
 *
 * Fetched rather than hardcoded: a pasted image URL is content-addressed and
 * would break the day that carpet is re-photographed. It waits until the
 * pointer reaches the menu bar rather than until a panel opens — Radix opens
 * on hover after a short delay, so asking a moment earlier means the picture is
 * there when the panel arrives instead of dropping into an empty frame. A
 * header that appears on every page still costs nothing until someone reaches
 * for it.
 */
function FeaturedPattern({ enabled }: { enabled: boolean }) {
  const { data, isPending } = useQuery({
    ...carpetListQuery({ pattern: ["lachak_toranj"], page_size: 1, sort: "price_desc" }),
    enabled,
  });
  const carpet = data?.items[0];
  const image = mediaUrl(carpet?.primary_image);

  return (
    <NavigationMenuLink asChild>
      <Link
        href="/carpets?pattern=lachak_toranj"
        className="toranjan-row group/f block"
        style={{ "--stagger": 240 } as React.CSSProperties}
      >
        <span
          className={cn(
            "relative block aspect-4/3 w-full overflow-hidden rounded border border-line bg-bg",
            // A frame that is briefly empty reads as broken; a frame that is
            // briefly breathing reads as loading.
            isPending && "animate-pulse",
          )}
        >
          {image && (
            <Image
              src={image}
              alt=""
              fill
              sizes="320px"
              className="object-contain p-4 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover/f:scale-[1.04]"
            />
          )}
        </span>
        <span className="mt-3 block text-sm">لچک‌ترنج</span>
        <span className="mt-1 block text-xs leading-loose text-muted">
          نقش مرکزی فرش ایرانی، و همان ترنجی که نام فروشگاه از آن آمده.
        </span>
      </Link>
    </NavigationMenuLink>
  );
}

/**
 * One row of a panel.
 *
 * `index` drives the staircase — rows arrive in order rather than as a block,
 * which is the entrance language the chosen direction uses everywhere else.
 * The label slides a little toward the reading edge under the pointer, so the
 * row answers before the colour does.
 */
function PanelLink({
  href,
  index = 0,
  children,
}: {
  href: string;
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <NavigationMenuLink asChild>
      <Link
        href={href}
        className="toranjan-row group/r block rounded-md p-3 text-sm text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-bg hover:text-ink focus-visible:bg-bg"
        style={{ "--stagger": index * 38 } as React.CSSProperties}
      >
        <span className="inline-block transition-transform duration-[350ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover/r:-translate-x-1 rtl:group-hover/r:translate-x-1">
          {children}
        </span>
      </Link>
    </NavigationMenuLink>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="toranjan-row mb-2 px-3 text-[11px] tracking-[0.18em] text-muted">{children}</p>
  );
}

export function SiteHeader({
  /** Overrides the device's cart. Only the design-review page passes it. */
  cartCount,
}: { cartCount?: number } = {}) {
  const storedCartCount = useCartCount();
  const count = cartCount ?? storedCartCount;
  const scrolled = useScrolled();
  const pathname = usePathname();
  // The featured rug is only worth fetching once the panel that shows it exists.
  const [menuTouched, setMenuTouched] = React.useState(false);

  return (
    <header
      className={cn(
        // The phone gap is tighter than the desktop one because at 320px this
        // bar is nearly full before the brand is placed at all: the drawer
        // button and the three tools spend 184px of it, and the padding another
        // 40. The 8px bought back here is what keeps a real margin under the
        // stacked wordmark instead of a rounding error. It falls between a
        // 44px button and the wordmark, so nothing looks crowded for it.
        "sticky top-0 z-50 flex items-center gap-2 bg-bg/85 px-5 backdrop-blur-md sm:gap-4 sm:px-8",
        "border-b border-line transition-[height,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
        scrolled ? "h-[62px] shadow-[0_10px_30px_-24px_rgba(24,24,27,0.5)]" : "h-[78px]",
      )}
    >
      {/* Mobile: the drawer trigger takes the leading corner, where a thumb is. */}
      <Sheet>
        <SheetTrigger
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line lg:hidden"
          aria-label="منو"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent title="منوی ترنجان">
          <nav className="mt-2 flex flex-col gap-1 overflow-y-auto pb-8">
            <SheetClose asChild>
              <Link href="/carpets" className="py-3 text-lg">
                همه‌ی فرش‌ها
              </Link>
            </SheetClose>

            <p className="mt-5 mb-1 text-[11px] tracking-[0.18em] text-muted">طرح</p>
            {NAV_PATTERNS.map((p) => (
              <SheetClose asChild key={p}>
                <Link href={`/carpets?pattern=${p}`} className="py-2.5 text-ink-2">
                  {PATTERN_LABEL[p]}
                </Link>
              </SheetClose>
            ))}

            <p className="mt-5 mb-1 text-[11px] tracking-[0.18em] text-muted">جنس</p>
            {NAV_MATERIALS.map((m) => (
              <SheetClose asChild key={m}>
                <Link href={`/carpets?material=${m}`} className="py-2.5 text-ink-2">
                  {MATERIAL_LABEL[m]}
                </Link>
              </SheetClose>
            ))}

            <p className="mt-5 mb-1 text-[11px] tracking-[0.18em] text-muted">اتاق</p>
            {NAV_ROOMS.map((r) => (
              <SheetClose asChild key={r}>
                <Link href={`/carpets?room=${r}`} className="py-2.5 text-ink-2">
                  {ROOM_LABEL[r]}
                </Link>
              </SheetClose>
            ))}

            <span className="my-5 h-px bg-line" />
            <p className="mb-1 text-[11px] tracking-[0.18em] text-muted">کمک به انتخاب</p>
            {HELP_LINKS.map((l) => (
              <SheetClose asChild key={l.href}>
                <Link href={l.href} className="py-2.5 text-ink-2">
                  {l.label}
                </Link>
              </SheetClose>
            ))}
            {/* Tracking has to be reachable by someone who left and came back
                with only a code. The confirmation screen links to it, but that
                screen is gone by the next visit.

                The drawer carries `/contact` as well, which the bar does not:
                the constraint up there is horizontal and there is none here. */}
            <span className="mt-5" />
            {DRAWER_LINKS.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link href={link.href} className="py-2.5 text-ink-2">
                  {link.label}
                </Link>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* The lockup turns a corner on a phone rather than losing half of itself.
          Side by side the two words want 167px of a 375px bar, which is what
          pushed the whole site into sideways scroll; stacked they want 70px and
          both survive. Two lines is the older form of this lockup anyway — a
          name with its transliteration set beneath it — so the phone gets the
          more formal arrangement, not a poorer one.

          The padding is sm-only on purpose. Stacked, the block is already 54px
          tall and clears the 44px the roadmap asks of anything you touch; in one
          row it is a 37px line box and needs the padding to get there. Adding it
          to both would make the stack 70px inside a header that shrinks to 62. */}
      <Link
        href="/"
        className="flex shrink-0 flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2.5 sm:py-2"
      >
        <span
          className={cn(
            "font-semibold tracking-tight transition-[font-size] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
            scrolled ? "text-[21px]" : "text-[25px]",
          )}
        >
          ترنجان
        </span>
        {/* aria-hidden because a reader that has just said «ترنجان» should not
            then spell the same name in Latin — not because the line is
            decoration. It carries most of what makes the header read as a shop
            rather than a page, so it is set two sizes down on a phone instead
            of dropped: 10px and slightly tighter spacing, which lands it at
            70px against the wordmark's 64px. Two lines of near-equal width is
            what makes a stack read as one mark.

            The fade on scroll stays a desktop manner. There the wordmark is one
            of several things competing for the bar and can afford to shed its
            second half; on a phone it is the only brand on screen, and a
            lockup that empties out as you scroll is just a gap. */}
        <span
          className={cn(
            // Playfair is a high-contrast face: the thin strokes are hairlines,
            // and at 10px on a phone they thin out until the line reads as a
            // grey smudge. Muted made it worse — #72727a clears the 4.5:1 the
            // roadmap asks by 0.07, and that ratio is measured on solid area,
            // which a hairline serif does not have. So the weight goes to 800,
            // heavy enough that the thin strokes still carry at 10px, and the
            // colour to ink-2, which is 10:1 and still two stops lighter than
            // the wordmark it sits under. It is the same mark at both sizes, so
            // both get it. 900 was legible too but left 320px viewports 0.4px
            // short, and glyph advances move about a percent between platforms
            // — a margin thinner than that rounding is not a margin.
            //
            // The negative end margin is the trailing letter-space coming back.
            // Tracking is added after every letter including the last, so the
            // stacked line hangs 2.6px clear of the wordmark above it and the
            // two stop looking like one mark. Only the stack needs it; in a row
            // that same space is what separates the two words.
            "ltr-isolate font-display font-extrabold text-[10px] tracking-[0.26em] text-ink-2 -me-[0.26em]",
            "sm:me-0 sm:text-[12px] sm:tracking-[0.34em]",
            "transition-[opacity,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
            scrolled && "sm:-translate-x-1.5 sm:opacity-0",
          )}
          aria-hidden="true"
        >
          TORANJAN
        </span>
      </Link>

      <NavigationMenu dir="rtl" className="hidden lg:flex">
        <NavigationMenuList
          className="gap-5"
          onPointerEnter={() => setMenuTouched(true)}
          onFocusCapture={() => setMenuTouched(true)}
        >
          <NavigationMenuItem value="carpets">
            <NavigationMenuTrigger>فرش‌ها</NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid w-[680px] grid-cols-[1fr_1fr_320px] gap-6 p-6">
                <div>
                  <PanelHeading>طرح</PanelHeading>
                  {NAV_PATTERNS.map((p, i) => (
                    <PanelLink key={p} index={i + 1} href={`/carpets?pattern=${p}`}>
                      {PATTERN_LABEL[p]}
                    </PanelLink>
                  ))}
                </div>
                <div>
                  <PanelHeading>اتاق</PanelHeading>
                  {NAV_ROOMS.map((r, i) => (
                    <PanelLink key={r} index={i + 2} href={`/carpets?room=${r}`}>
                      {ROOM_LABEL[r]}
                    </PanelLink>
                  ))}
                  <span className="my-3 block h-px bg-line" />
                  <PanelLink index={NAV_ROOMS.length + 2} href="/carpets">
                    همه‌ی فرش‌ها
                  </PanelLink>
                </div>
                <FeaturedPattern enabled={menuTouched} />
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>جنس</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[360px] grid-cols-2 gap-1 p-5">
                {NAV_MATERIALS.map((m, i) => (
                  <li key={m}>
                    <PanelLink index={i + 1} href={`/carpets?material=${m}`}>
                      {MATERIAL_LABEL[m]}
                    </PanelLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>کمک به انتخاب</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="w-[380px] p-5">
                {HELP_LINKS.map((link, i) => (
                  <li key={link.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={link.href}
                        className="toranjan-row group/r block rounded-md p-3 transition-colors duration-[--dur-feedback] hover:bg-bg"
                        style={{ "--stagger": (i + 1) * 55 } as React.CSSProperties}
                      >
                        <span className="block text-sm transition-transform duration-[350ms] ease-[cubic-bezier(.16,1,.3,1)] rtl:group-hover/r:translate-x-1">
                          {link.label}
                        </span>
                        <span className="mt-1 block text-xs leading-loose text-muted">
                          {link.note}
                        </span>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {FLAT_LINKS.map((item) => (
            <NavigationMenuItem key={item.href}>
              <NavigationMenuLink asChild>
                <Link
                  href={item.href}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    // The one thing that differs from the shared style: the rule
                    // runs the full width of the entry instead of stopping at
                    // the padding. Its vertical offset and its draw-in are left
                    // with the shared style, which is measured against the
                    // entry's height — restating them here is how the underline
                    // ends up floating off the word the next time that changes.
                    "after:inset-x-0",
                    pathname === item.href && "text-ink after:scale-x-100",
                  )}
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="ms-auto flex shrink-0 items-center gap-1">
        {/* Search is a destination, not a field — see the note at the top. */}
        <Link
          href="/carpets"
          aria-label="جست‌وجو در فرش‌ها"
          className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink"
        >
          <Search className="size-5" />
        </Link>
        <Link
          href="/favourites"
          aria-label="علاقه‌مندی‌ها"
          className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink"
        >
          <Heart className="size-5" />
        </Link>
        <Link
          href="/cart"
          aria-label={count > 0 ? `سبد خرید، ${formatNumber(count)} قلم` : "سبد خرید"}
          className="relative grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink"
        >
          <ShoppingBag className="size-5" />
          {/* The one piece of gold in the header, and only when it means
              something. An empty cart wearing a badge is decoration. */}
          {count > 0 && (
            <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-white">
              {formatNumber(count)}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
