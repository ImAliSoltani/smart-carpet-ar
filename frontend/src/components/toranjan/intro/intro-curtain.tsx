"use client";

import * as React from "react";

import { IntroSequence } from "./intro-sequence";

/**
 * The seam between the film and the shop.
 *
 * The brief settled what happens here: after the fifth scene the wordmark
 * settles on the dark carpet, and then the home page **rises from below like a
 * curtain** — that rise is where dark becomes light, and it is one of the
 * moments the site is for. It lands on the home page, not the product grid,
 * because a wall of seventy cards cannot say «this one can stand on your own
 * floor at its real size», which is the whole argument.
 *
 * **The transform lives in CSS, not here**, and that is what stops the shop
 * flashing before the curtain covers it. A blocking script in the document head
 * stamps `data-intro` on `<html>` before the first paint; the stylesheet reads
 * it and holds the page down. React cannot win that race — anything it does
 * happens after hydration, by which time the shop has been on screen for a
 * moment and is then covered, which is worse than never gating at all.
 *
 * So the split is: CSS owns whether the page is down and the animation that
 * lifts it; React owns the film and the moment the film says it is done.
 */

// A one-value store, because the value it publishes is an attribute on <html>
// set by a script that ran before React existed. `useSyncExternalStore` is the
// sanctioned way to read something like that without lying to hydration: the
// server snapshot is always `false`, so the server and the first client render
// agree, and the truth arrives immediately after.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readPlaying() {
  return document.documentElement.getAttribute("data-intro") === "play";
}

export function IntroCurtain({ children }: { children: React.ReactNode }) {
  const playing = React.useSyncExternalStore(subscribe, readPlaying, () => false);

  const finish = React.useCallback(() => {
    // `done` rather than removing the attribute: the stylesheet transitions the
    // page up from this state, and a missing attribute would snap it instead.
    document.documentElement.setAttribute("data-intro", "done");
    listeners.forEach((l) => l());
  }, []);

  return (
    <>
      <div data-intro-content>{children}</div>
      {playing && <IntroSequence onDone={finish} />}
    </>
  );
}
