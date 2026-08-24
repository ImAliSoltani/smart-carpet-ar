"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { TABS, tabIndexFor, type NavDirection } from "@/lib/tabs";

/**
 * Sideways travel between the five tabs: the gesture, and the direction the
 * page animates in.
 *
 * It renders nothing. **That is the point** — the alternative is a wrapper that
 * slides, and a transformed element becomes the containing block for
 * `position: fixed` and disturbs `sticky`. This shop has a sticky header, a
 * sticky compare tray and a fixed bottom bar, all of which would break. The
 * motion is a view transition on a *snapshot* instead (`globals.css`, «MOVING
 * BETWEEN THE FIVE TABS»), so nothing in the live tree is ever transformed.
 *
 * The direction is written to `<html data-nav>` a moment before the navigation
 * and cleared when the transition settles, so those rules apply to tab moves
 * and to nothing else: a carpet opening from the grid still morphs.
 */

/**
 * How far a finger has to travel before this is a swipe and not a tap or a
 * scroll, and how much straighter than vertical it has to be.
 *
 * 64px because a thumb wanders ten or fifteen pixels during an ordinary tap.
 * The ratio matters more than the distance: a vertical flick on a long page
 * drifts sideways, and the page scrolling under the finger while the shop also
 * changed tabs is the one outcome worth engineering against.
 */
const SWIPE_MIN_PX = 64;
const SWIPE_DOMINANCE = 1.7;

/** Anything that scrolls sideways owns horizontal drags inside it. */
function startsInsideAHorizontalScroller(target: EventTarget | null): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    // The compare table, the product gallery, a code block, a filter row: each
    // is a strip the visitor drags on purpose, and stealing that to change tabs
    // would make those surfaces unusable. `clientWidth + 1` because a rounded
    // sub-pixel width reports one stray pixel of scroll on elements that do not
    // scroll at all.
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    // A canvas or a map handles its own drags — the AR page and the corner
    // editor both live behind one.
    if (node.tagName === "CANVAS" || node.closest("[data-no-swipe]")) return true;
    node = node.parentElement;
  }
  return false;
}

export function TabSwipe() {
  const router = useRouter();
  const pathname = usePathname();
  const start = React.useRef<{ x: number; y: number; id: number } | null>(null);

  const go = React.useCallback(
    (direction: NavDirection) => {
      // **Asked of the document, not of React.** The first version held the
      // index in a ref synced by an effect, and two swipes in quick succession
      // read a stale one: the second gesture was measured against the tab the
      // first had already left, so «forward then back» went forward and then
      // nowhere. Caught by a test doing exactly that with no pause between.
      //
      // `location.pathname` is updated by the router before the effect that
      // would have written the ref, and it cannot be a render behind. Same
      // reasoning as `hasPointerCapture` over `dragging` in the corner editor.
      const from = tabIndexFor(window.location.pathname);
      if (from < 0) return;
      const to = direction === "next" ? from + 1 : from - 1;
      // The strip has ends. Silence is the honest answer at them — a bounce
      // would be inventing a place to go.
      if (to < 0 || to >= TABS.length) return;

      const root = document.documentElement;
      root.dataset.nav = direction;
      router.push(TABS[to].href);
    },
    [router],
  );

  React.useEffect(() => {
    const onDown = (event: PointerEvent) => {
      // Touch and pen only. A mouse drag across a page is a text selection, and
      // a trackpad's horizontal scroll is not a pointer event at all.
      if (event.pointerType === "mouse" || !event.isPrimary) return;
      if (startsInsideAHorizontalScroller(event.target)) return;
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    };

    /**
     * Decided here, on the way, rather than on release.
     *
     * **This is the whole reason it did nothing on a real phone.** The first
     * version waited for `pointerup`, and on a touchscreen that event often
     * never comes: the moment the browser decides a finger is panning it takes
     * the gesture for itself and sends `pointercancel` instead. Every swipe
     * that mattered was cancelled before it was measured.
     *
     * The tests did not catch it because they dispatch a `pointerdown` and a
     * `pointerup` directly, so there was never a cancel to lose to. They proved
     * the handler and not the platform — which is the more useful half of the
     * lesson.
     *
     * Crossing the threshold is now the decision, so a cancel arriving
     * afterwards is simply too late to matter.
     */
    const onMove = (event: PointerEvent) => {
      const from = start.current;
      if (!from || from.id !== event.pointerId) return;

      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;

      // A drag that commits to vertical is a scroll, and it stays one: dropping
      // the origin here stops a long diagonal from turning into a swipe halfway
      // down the page.
      if (Math.abs(dy) > SWIPE_MIN_PX && Math.abs(dy) > Math.abs(dx)) {
        start.current = null;
        return;
      }

      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return;

      start.current = null;
      // The page follows the finger. Index 0 is the rightmost tab, so a higher
      // index is further left on screen and reaching it moves the strip right —
      // which is a finger travelling right. The reasoning is written out in
      // `lib/tabs.ts`; it is the kind of thing that is obvious and backwards.
      go(dx > 0 ? "next" : "prev");
    };

    // `pointerup` stays as well, for the pointer stream that is never cancelled:
    // a pen, a mouse-emulating device, and the synthetic pairs the tests send.
    const onUp = (event: PointerEvent) => {
      onMove(event);
      start.current = null;
    };

    const onCancel = () => {
      start.current = null;
    };

    // Passive throughout: this never calls `preventDefault`, so scrolling is
    // untouched while the gesture is still ambiguous.
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [go]);

  // Clear the direction once the page has arrived. Left on, the next
  // navigation of any kind — a carpet opening from the grid — would slide
  // instead of morphing.
  React.useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.nav) return;
    const timer = window.setTimeout(() => {
      delete root.dataset.nav;
    }, 700);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
