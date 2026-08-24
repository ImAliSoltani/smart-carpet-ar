"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCartLines } from "@/lib/store/cart";
import { useCompare } from "@/lib/store/compare";
import { formatNumber } from "@/lib/format";
import { TABS, directionBetween, tabIndexFor } from "@/lib/tabs";
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


/**
 * The label opens to whatever its own words need — `auto`, not a constant.
 *
 * It was 84px, «sized from جست‌وجوی بصری, the longest», and that was measured
 * wrong: at 12.5px Vazirmatn that label is **90.3px**, so the one item whose
 * name is the reason this bar exists was the one clipped mid-word. A fixed
 * width also means every future label is a silent bet, and Persian labels are
 * not short.
 *
 * Framer measures the natural width to animate into, so the spring survives.
 */
const LABEL_WIDTH = "auto";


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
          // Every number here was bought, and the budget is the reason.
          //
          // Four resting items sit at their 44px floor — §3-5, not negotiable —
          // so 176px is spent before anything is drawn. The open item is its
          // icon, its padding and its word: 143px when that word is
          // «جست‌وجوی بصری». That leaves the gaps, the pill's own padding and
          // the cap, and on a 360px Android all three together decide whether
          // the label is whole or clamped mid-word.
          //
          // `gap-0.5` and `p-1.5` give back 12px, and the cap becomes the
          // viewport less a 6px margin each side rather than 95vw — 348px
          // instead of 342 on that phone, against 339 needed. `max-w` still
          // exists because a pill wider than the screen is worse than a clipped
          // one, and because §3-5 forbids horizontal scroll on the document.
          className="fixed inset-x-0 z-30 mx-auto flex w-fit max-w-[calc(100vw-0.75rem)] items-center gap-0.5 rounded-full border border-line bg-paper/95 p-1.5 shadow-[0_10px_40px_-18px_rgba(24,24,27,0.5)] backdrop-blur-md lg:hidden"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {TABS.map((item, i) => {
            const Icon = item.icon;
            const active = i === tabIndexFor(pathname);
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
                // A tap travels the same strip a swipe does, so it animates the
                // same way. Set here rather than in an effect after the route
                // changes: the snapshot is taken as the navigation starts, and
                // an attribute written afterwards arrives too late to be in it.
                onClick={() => {
                  const direction = directionBetween(pathname, item.href);
                  if (direction) document.documentElement.dataset.nav = direction;
                }}
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
                  // Below 360px there is no arithmetic that fits five 44px
                  // targets and a Persian word: the icons alone are 176 and the
                  // open item is 143. So the word is not drawn at all rather
                  // than drawn half — the tint still says which item is
                  // current, and `aria-label` on the link says its name whether
                  // or not the word is painted.
                  className="overflow-hidden whitespace-nowrap text-[12.5px] leading-[1.9] max-[359px]:hidden"
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
