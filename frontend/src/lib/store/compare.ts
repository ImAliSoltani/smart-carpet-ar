"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { useStoreHydrated } from "./hydrated";

/**
 * The comparison shortlist (ROADMAP §6-11).
 *
 * Carpet ids only — the catalogue is asked for everything about them. A
 * shortlist that carried its own copy of the prices would be a shortlist that
 * shows yesterday's.
 *
 * **It lasts the visit, not the device, and that is the difference between this
 * and the favourites.** A comparison is a question somebody is asking right
 * now — «which of these four» — and it is answered by the end of the visit.
 * Coming back a week later to a bar across the bottom of the screen holding four
 * carpets you no longer remember choosing is not a saved shortlist, it is
 * leftovers: it takes up the screen, it says the shop is in a state you did not
 * put it in, and the first thing it asks of you is to clear it. Favourites are
 * the opposite kind of list — chosen deliberately, meant to be found again — and
 * they stay in `localStorage`. So this one is `sessionStorage`: it survives
 * reloads and moving around the shop, and it is gone the next time the site is
 * opened.
 *
 * **Why the ids are not in the URL.** «حالت همان URL است» was settled for the
 * filters, where the URL is the only place a server-rendered list can keep its
 * state and a filtered view is worth sharing. A shortlist is the other kind of
 * state: it belongs to the person looking, not to the address. Putting it in the
 * URL as well would give it two homes, and the pair drifts the first time
 * someone opens the page from a stale link with three carpets already chosen.
 */

// Before this was session-scoped it was written to `localStorage`, so a device
// that has been here already still carries that key. Nothing reads it now, and
// leaving it behind means a shortlist from some earlier visit sitting in storage
// for good.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("toranjan.compare");
  } catch {
    // Storage can be refused outright — private mode, blocked cookies. Failing
    // to tidy up is not worth throwing on import over.
  }
}

/**
 * Four.
 *
 * Not an arbitrary round number: at 1280 the table gives its label column 150px
 * and splits the rest four ways, which leaves each carpet about 240px — the
 * narrowest a photograph can be and still be worth looking at beside another
 * one. A fifth column would mean sideways scrolling on a desktop to compare two
 * carpets that no longer fit on screen together, which is the one thing a
 * comparison must not ask for.
 */
export const COMPARE_LIMIT = 4;

interface CompareState {
  ids: number[];
  toggle: (carpetId: number) => void;
  remove: (carpetId: number) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (carpetId) =>
        set((state) => {
          if (state.ids.includes(carpetId)) {
            return { ids: state.ids.filter((id) => id !== carpetId) };
          }
          // Silently refusing would be a button that does nothing. The callers
          // read `isFull` and say so before the press instead.
          if (state.ids.length >= COMPARE_LIMIT) return state;
          // Appended, not prepended — the opposite of the favourites, and for a
          // reason the favourites do not have. These ids are columns. A carpet
          // added while the reader is halfway through reading the table would
          // push every column they were reading one place along; at the end it
          // arrives where the eye is not.
          return { ids: [...state.ids, carpetId] };
        }),
      remove: (carpetId) =>
        set((state) => ({ ids: state.ids.filter((id) => id !== carpetId) })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: "toranjan.compare",
      version: 1,
      // `sessionStorage`, not `localStorage` — see the note at the top of the
      // file. This is the whole mechanism: the browser drops it when the site
      // is closed, so nothing has to be cleared on load and there is no «is
      // this shortlist too old» rule to write or to get wrong.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);

export interface CompareApi {
  ids: number[];
  has: (carpetId: number) => boolean;
  toggle: (carpetId: number) => void;
  remove: (carpetId: number) => void;
  clear: () => void;
  hydrated: boolean;
  /** No room for another carpet — the toggles say so rather than going dead. */
  isFull: boolean;
}

export function useCompare(): CompareApi {
  const hydrated = useStoreHydrated(useCompareStore);
  const stored = useCompareStore((state) => state.ids);
  const toggle = useCompareStore((state) => state.toggle);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  // Before hydration the browser must paint what the server painted: nothing.
  const ids = hydrated ? stored : [];
  const lookup = new Set(ids);
  return {
    ids,
    has: (carpetId) => lookup.has(carpetId),
    toggle,
    remove,
    clear,
    hydrated,
    isFull: ids.length >= COMPARE_LIMIT,
  };
}
