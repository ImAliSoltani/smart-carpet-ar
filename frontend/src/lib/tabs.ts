import type * as React from "react";
import { Camera, Ruler, ShoppingBag, Sofa } from "lucide-react";

import { RugIcon } from "@/components/toranjan/rug-icon";

/**
 * The five top-level destinations, in the order they are drawn.
 *
 * One list, because two things now depend on the order and they must agree:
 * the bar draws it, and the swipe gesture walks it. A second copy would drift
 * the first time an item moved, and the symptom would be a swipe that lands on
 * the tab next to the one the bar highlights.
 *
 * **The order is the layout, and the layout is right-to-left.** Index 0 is the
 * rightmost item on screen and index 4 the leftmost, because that is reading
 * order here. Everything about direction below follows from that one fact.
 */
export interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

export const TABS: readonly Tab[] = [
  { href: "/carpets", label: "فرش‌ها", icon: RugIcon },
  { href: "/visual-search", label: "جست‌وجوی بصری", icon: Camera },
  { href: "/room-adviser", label: "مشاور چیدمان", icon: Sofa },
  { href: "/size-guide", label: "راهنمای اندازه", icon: Ruler },
  { href: "/cart", label: "سبد خرید", icon: ShoppingBag },
] as const;

/**
 * Which tab a path belongs to, or -1.
 *
 * `/carpets` owns `/carpets/{slug}` and its AR page, or browsing a rug unlights
 * the tab that took you there — and, now, makes the rug's own page unswipeable.
 * Exact match everywhere else: `/cart` has no children.
 */
export function tabIndexFor(pathname: string): number {
  return TABS.findIndex((tab) =>
    tab.href === "/carpets"
      ? pathname === "/carpets" || pathname.startsWith("/carpets/")
      : pathname === tab.href,
  );
}

/**
 * Which way the page should travel, given where it came from and where it goes.
 *
 * **Derived from the layout rather than chosen, because guessing it gets it
 * backwards.** Index 0 is the rightmost tab, so a higher index sits further
 * *left* on screen. Picture the five as one strip: `[4][3][2][1][0]`, left to
 * right, with the current one centred.
 *
 * To reach a higher index — a tab that is off-screen to the left — the strip
 * has to move **right**. The page being left therefore exits to the right, the
 * arriving one enters from the left, and the finger that does this drags
 * right. That is the whole rule, and it is the one every other direction in
 * this feature is read off: the page follows the finger.
 */
export type NavDirection = "next" | "prev";

export function directionBetween(from: string, to: string): NavDirection | null {
  const a = tabIndexFor(from);
  const b = tabIndexFor(to);
  if (a < 0 || b < 0 || a === b) return null;
  return b > a ? "next" : "prev";
}
