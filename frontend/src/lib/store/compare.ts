"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { useStoreHydrated } from "./hydrated";

/**
 * The comparison shortlist (ROADMAP §6-11).
 *
 * Carpet ids, like the favourites — the device remembers which carpets, and the
 * catalogue is asked for everything about them. A shortlist that carried its own
 * copy of the prices would be a shortlist that shows yesterday's.
 *
 * **Why the ids are not in the URL.** «حالت همان URL است» was settled for the
 * filters, where the URL is the only place a server-rendered list can keep its
 * state and a filtered view is worth sharing. A shortlist is the other kind of
 * state: it is written on this device, exactly like the cart and the favourites,
 * and §6-11 says so outright. Putting it in the URL as well would give it two
 * homes, and the pair drifts the first time someone opens the page from a stale
 * link with three carpets already chosen.
 */

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
      storage: createJSONStorage(() => localStorage),
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
