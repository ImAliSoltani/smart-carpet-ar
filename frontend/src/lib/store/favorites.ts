"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { useStoreHydrated } from "./hydrated";

/**
 * Favourites (ROADMAP §6-11).
 *
 * Carpet ids only. Unlike the cart, nothing here needs to be drawn without the
 * API — the favourites page asks for those carpets and gets today's prices and
 * today's photographs, so keeping a snapshot would only be a way to show
 * something out of date.
 *
 * Stored as an array because `Set` does not survive `JSON.stringify`; it is
 * turned back into a `Set` for lookups, which the grid does once per carpet.
 */

interface FavoritesState {
  ids: number[];
  toggle: (carpetId: number) => void;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (carpetId) =>
        set((state) => ({
          ids: state.ids.includes(carpetId)
            ? state.ids.filter((id) => id !== carpetId)
            : // newest first: the favourites page reads as a list of what was
              // just found, not a list of what was found first
              [carpetId, ...state.ids],
        })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: "toranjan.favorites",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);

export function useFavorites(): {
  ids: number[];
  has: (carpetId: number) => boolean;
  toggle: (carpetId: number) => void;
  hydrated: boolean;
} {
  const hydrated = useStoreHydrated(useFavoritesStore);
  const ids = useFavoritesStore((state) => state.ids);
  const toggle = useFavoritesStore((state) => state.toggle);
  const visible = hydrated ? ids : [];
  const lookup = new Set(visible);
  return { ids: visible, has: (id) => lookup.has(id), toggle, hydrated };
}

export function useFavoritesCount(): number {
  const { ids } = useFavorites();
  return ids.length;
}
