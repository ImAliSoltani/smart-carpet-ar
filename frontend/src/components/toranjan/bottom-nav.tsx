"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, LayoutGrid, Ruler, ShoppingBag, Sofa } from "lucide-react";

import { useCartLines } from "@/lib/store/cart";
import { useCompare } from "@/lib/store/compare";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The phone's primary navigation.
 *
 * From [arunachalam/bottom-nav-bar](https://21st.dev/@arunachalam/components/bottom-nav-bar),
 * kept for its shape: a floating pill of icons where the active one opens to
 * show its label.
 *
 * It exists because the mega-menu and the drawer are both behind a hamburger,
 * and a shopper on a phone does not open a hamburger to discover that the shop
 * can search by photograph. The three things this product is *for* were three
 * taps deep on the device most people will hold.
 *
 * What changed from the registry component:
 *
 * - **Links, not buttons with `useState`.** The original tracked its own active
 *   index, which makes the bar a control rather than a map: it would light the
 *   wrong tab after a back button, say nothing about where you are on a page it
 *   never navigated to, and none of its destinations would be a URL. Active
 *   state is derived from `usePathname` so the bar always describes the page it
 *   is on, and every item is a real navigation.
 * - **Five items, not six** — §9 `bottom-nav-limit`, and the sixth was pushing
 *   the pill past a 375px screen.
 * - **No entrance animation.** The original springs in on mount, which on a
 *   persistent bar means re-animating on every navigation. It is also the one
 *   place `initial` would have to branch on `useReducedMotion`, and this
 *   repository has already paid for that hydration mismatch once.
 * - **Project tokens.** `bg-card`/`text-primary` became paper, ink and accent.
 * - **`gap`, not `space-x`.** Physical margins in a right-to-left row.
 */

const ITEMS = [
  { href: "/carpets", label: "فرش‌ها", icon: LayoutGrid },
  { href: "/visual-search", label: "جست‌وجوی بصری", icon: Camera },
  { href: "/room-adviser", label: "مشاور چیدمان", icon: Sofa },
  { href: "/size-guide", label: "راهنمای اندازه", icon: Ruler },
  { href: "/cart", label: "سبد خرید", icon: ShoppingBag },
] as const;

/** How wide the label may open to. Sized from «جست‌وجوی بصری», the longest. */
const LABEL_WIDTH = 84;

function isCurrent(pathname: string, href: string) {
  // `/carpets` must also own `/carpets/{slug}` and its AR page, or browsing a
  // rug unlights the tab that took you there. Exact match everywhere else:
  // `/cart` has no children, and prefix-matching `/` would light on every page.
  if (href === "/carpets") return pathname === "/carpets" || pathname.startsWith("/carpets/");
  return pathname === href;
}

export function BottomNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const compare = useCompare();
  const { lines, hydrated } = useCartLines();

  const count = hydrated ? lines.reduce((sum, line) => sum + line.quantity, 0) : 0;

  // The compare tray owns the bottom of the screen while it is open, and it is
  // `sticky` at `z-40` — so a fixed bar underneath it is not hidden, it is
  // half-covered, which looks like a bug rather than a decision. The tray is a
  // task the shopper started; this bar is ambient. The task wins.
  const trayOpen = compare.hydrated && compare.ids.length > 0;

  return (
    <AnimatePresence>
      {!trayOpen && (
        <motion.nav
          // Only the leaving and arriving of the whole bar is animated, and
          // only when the tray takes over. `initial={false}` on the presence
          // wrapper below would suppress the first appearance too.
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 24 }}
          transition={{ duration: reduced ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          role="navigation"
          aria-label="ناوبری اصلی"
          // Hidden from `lg` up: §9 `adaptive-navigation` gives large screens
          // the header, which is already there and already complete.
          //
          // The inset is the gesture bar on a phone without a home button. Left
          // out, the pill sits under the system indicator and the last item is
          // the one that suffers.
          className="fixed inset-x-0 z-30 mx-auto flex w-fit max-w-[95vw] items-center gap-1 rounded-full border border-line bg-paper/95 p-2 shadow-[0_10px_40px_-18px_rgba(24,24,27,0.5)] backdrop-blur-md lg:hidden"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(pathname, item.href);
            const isCart = item.href === "/cart";

            return (
              <Link
                key={item.href}
                href={item.href}
                // Spoken on every item, always — the label is only *drawn* on
                // the active one, and an icon a screen reader cannot name is
                // not a destination.
                aria-label={
                  isCart && count > 0
                    ? `${item.label}، ${formatNumber(count)} قلم`
                    : item.label
                }
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 min-w-11 items-center justify-center rounded-full px-3",
                  "transition-colors duration-[--dur-feedback]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  // `accent-strong`, not `accent`, and it was measured rather
                  // than chosen: `--accent` on this tinted chip is 4.32:1, and
                  // the label beside the icon is 12.5px text, which owes 4.5.
                  // The icon alone would have passed — but «the icon passes and
                  // the word next to it does not» is not a state this design
                  // has. `--accent-strong` is 5.50:1 on the same chip and is
                  // already the token for exactly this, in both themes.
                  active ? "bg-accent/10 text-accent-strong" : "text-muted hover:bg-bg",
                )}
              >
                <span className="relative">
                  <Icon size={21} strokeWidth={1.75} aria-hidden />
                  {isCart && count > 0 && (
                    <span
                      aria-hidden
                      className="absolute -end-1.5 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 font-figure text-[10px] leading-4 text-on-cta"
                    >
                      {formatNumber(count)}
                    </span>
                  )}
                </span>

                <motion.span
                  // `width`, not `display`: the pill has to grow smoothly, and
                  // the label must not wrap while it does.
                  initial={false}
                  animate={{
                    width: active ? LABEL_WIDTH : 0,
                    opacity: active ? 1 : 0,
                    marginInlineStart: active ? 8 : 0,
                  }}
                  transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden whitespace-nowrap text-[12.5px] leading-[1.9]"
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
