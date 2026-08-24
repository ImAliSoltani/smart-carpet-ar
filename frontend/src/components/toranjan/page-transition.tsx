"use client";

import { ViewTransition } from "react";

/**
 * The boundary that makes a shop navigation a transition at all.
 *
 * React only calls `startViewTransition` when a `<ViewTransition>` takes part
 * in the update. Until now the only boundaries were the two carpet photographs
 * — the grid card and the product frame — so every other navigation swapped
 * instantly, and the tab rules in `globals.css` were correct CSS applied to a
 * transition that never started. Measured before this existed: `calls: 0`.
 *
 * Wrapping the page body gives every shop navigation a snapshot to animate.
 * The named photo boundary still sits inside it and still wins for the carpet
 * it names — that is what a nested boundary is for — so opening a rug from the
 * grid morphs exactly as it did, and a step between tabs slides.
 *
 * It wraps the **page** and not the chrome, deliberately. The header, the
 * compare tray and the bottom bar stay outside so they hold still while the
 * page moves under them, which is what makes it read as one shop rather than
 * five.
 */
/**
 * The name matters, and getting it wrong is invisible until measured.
 *
 * Left unnamed, React generates one (`_t_0_`) and the page body becomes its own
 * snapshot group — which lifts it *out* of `root`. `root` is then everything
 * else: the header, the footer, the bottom bar. Sliding `root`, as the first
 * version did, slid the chrome and cross-faded the page: exactly backwards, and
 * it took reading `getAnimations()` to see it rather than watching.
 *
 * Named, the page body can be addressed directly, so the thing that travels is
 * the thing the visitor is looking at and the chrome holds still around it.
 */
export const SHOP_PAGE = "shop-page";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return <ViewTransition name={SHOP_PAGE}>{children}</ViewTransition>;
}
