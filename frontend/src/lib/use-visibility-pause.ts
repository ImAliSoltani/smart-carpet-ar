"use client";

import * as React from "react";

/**
 * Whether an element is worth animating — on screen, and the tab in front.
 *
 * It lives here rather than beside its first caller because the second one
 * needed exactly the same three facts, and the second one needed them for a
 * different reason. The comparator asks so it can stop a spring simulation
 * nobody is watching; the showcase asks because a slide that turns behind the
 * entrance film, or two screens below the fold, is a turn spent where it cannot
 * be seen — and the visitor who then arrives waits out the tail of an interval
 * that started without them.
 *
 * `threshold` is the fraction of the *element* that has to be visible, so a
 * section taller than the viewport can never reach a high one. 0.2 is the value
 * both callers use: enough to mean «this is on the visitor's screen», low
 * enough that a tall section still reaches it.
 */
export function useVisibilityPause<T extends Element>(
  ref: React.RefObject<T | null>,
  { threshold = 0.1 }: { threshold?: number } = {},
): boolean {
  const [onScreen, setOnScreen] = React.useState(true);
  const [tabVisible, setTabVisible] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((e) => e.isIntersecting)),
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  React.useEffect(() => {
    // No synchronous first read. A tab that is already hidden at mount leaves
    // this `true` until the next `visibilitychange` — which costs nothing,
    // because the browser does not schedule `requestAnimationFrame` in a hidden
    // tab either. Calling it here would be a `setState` in an effect body for
    // a state that is already correct in every case that can be observed.
    const onVis = () => setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return onScreen && tabVisible;
}
