"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
    note: "عکس یک فرش را بده، شبیه‌هایش را پیدا می‌کنیم.",
  },
  {
    href: "/room-adviser",
    label: "مشاور چیدمان",
    note: "عکس اتاقت را بده، بگوییم چه فرشی به آن می‌آید.",
  },
  {
    href: "/size-guide",
    label: "راهنمای اندازه",
    note: "از روی عکس اتاق، اندازه‌ی مناسب را پیشنهاد می‌دهیم.",
  },
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
    ...carpetListQuery({ pattern: "lachak_toranj", page_size: 1, sort: "price_desc" }),
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

export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  const scrolled = useScrolled();
  const pathname = usePathname();
  // The featured rug is only worth fetching once the panel that shows it exists.
  const [menuTouched, setMenuTouched] = React.useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex items-center gap-4 bg-bg/85 px-5 backdrop-blur-md sm:px-8",
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
            <SheetClose asChild>
              <Link href="/about" className="mt-5 py-2.5 text-ink-2">
                درباره‌ی ما
              </Link>
            </SheetClose>
          </nav>
        </SheetContent>
      </Sheet>

      <Link href="/" className="flex shrink-0 items-baseline gap-2.5">
        <span
          className={cn(
            "font-semibold tracking-tight transition-[font-size] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
            scrolled ? "text-[21px]" : "text-[25px]",
          )}
        >
          ترنجان
        </span>
        <span
          className={cn(
            "ltr-isolate font-display text-[12px] tracking-[0.34em] text-muted",
            "transition-[opacity,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)]",
            scrolled && "-translate-x-1.5 opacity-0",
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

          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                href="/about"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-right after:scale-x-0 after:bg-ink",
                  "after:transition-transform after:duration-[450ms] after:ease-[cubic-bezier(.16,1,.3,1)] hover:after:scale-x-100",
                  pathname === "/about" && "text-ink after:scale-x-100",
                )}
              >
                درباره‌ی ما
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
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
          aria-label={cartCount > 0 ? `سبد خرید، ${formatNumber(cartCount)} قلم` : "سبد خرید"}
          className="relative grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink"
        >
          <ShoppingBag className="size-5" />
          {/* The one piece of gold in the header, and only when it means
              something. An empty cart wearing a badge is decoration. */}
          {cartCount > 0 && (
            <span className="absolute end-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-white">
              {formatNumber(cartCount)}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
