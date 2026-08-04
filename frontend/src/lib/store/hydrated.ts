"use client";

import * as React from "react";

/**
 * Whether a persisted store has finished reading `localStorage`.
 *
 * Everything in the cart and the favourites is written on this device and
 * nowhere else, so the server has no way to render it. It renders the empty
 * version, and the browser would immediately render the full one — which is a
 * hydration mismatch, the same class of bug the product page hit with
 * `useReducedMotion`.
 *
 * The fix is to keep the browser's first paint identical to the server's and
 * let the real numbers arrive one tick later. Anything reading a persisted
 * store must gate on this rather than branch on `typeof window`.
 */
export function useStoreHydrated(store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
}): boolean {
  // `useSyncExternalStore`, not an effect that calls `setState`: rehydration is
  // an event outside React, and this is the subscribe/read pair React asks for.
  // The third argument is what the server renders — never hydrated, so the
  // markup it produces is the one the browser starts from.
  return React.useSyncExternalStore(
    React.useCallback((onChange) => store.persist.onFinishHydration(onChange), [store]),
    () => store.persist.hasHydrated(),
    () => false,
  );
}
