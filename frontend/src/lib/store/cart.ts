"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { useStoreHydrated } from "./hydrated";
import type { Money } from "@/lib/api/types";

/**
 * The cart.
 *
 * There is no buyer account (ROADMAP §4), so the cart lives on the device and
 * nowhere else. `localStorage`, not a cookie: it is never sent with a request,
 * and the server has no use for it — an order carries only what the buyer
 * confirms at checkout.
 *
 * **What is authoritative and what is a snapshot.** `POST /api/v1/orders`
 * takes `{variant_id, quantity}` and looks up the name, the size and the price
 * itself. So `variantId` and `quantity` are the real cart; every other field
 * here exists to draw a row without a round trip and is a copy of what the API
 * said when the item went in. A price that moved while the cart sat in a
 * closed tab will therefore show stale until the cart page refetches it —
 * which is the checkout's job, and the reason the backend never trusts these
 * numbers.
 *
 * The two limits come from `OrderCreate`: at most 20 distinct lines, at most
 * 20 of any one. Enforced here so the shop cannot build a cart the API will
 * refuse.
 */

export const MAX_LINES = 20;
export const MAX_PER_LINE = 20;

export interface CartLine {
  /** The only field the order endpoint reads, along with `quantity`. */
  variantId: number;
  quantity: number;

  // --- display snapshot, refreshed by whoever renders the cart ---
  carpetId: number;
  carpetSlug: string;
  carpetName: string;
  widthCm: number;
  lengthCm: number;
  unitPrice: Money;
  imageUrl: string | null;
}

interface CartState {
  lines: CartLine[];
  /** Adds, or raises the quantity if this size is already in the cart. */
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
}

const clampQuantity = (value: number) =>
  Math.max(1, Math.min(MAX_PER_LINE, Math.round(value)));

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      add: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.variantId === line.variantId
                  ? { ...line, quantity: clampQuantity(l.quantity + quantity) }
                  : l,
              ),
            };
          }
          if (state.lines.length >= MAX_LINES) return state;
          return { lines: [...state.lines, { ...line, quantity: clampQuantity(quantity) }] };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          lines:
            quantity < 1
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) =>
                  l.variantId === variantId ? { ...l, quantity: clampQuantity(quantity) } : l,
                ),
        })),

      remove: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),

      clear: () => set({ lines: [] }),
    }),
    {
      name: "toranjan.cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only the data. The actions are rebuilt on every load, and writing them
      // out once would pin today's shape into a stranger's browser.
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

/** Total pieces, not lines — the badge counts what is being bought. */
export function useCartCount(): number {
  const hydrated = useStoreHydrated(useCartStore);
  const lines = useCartStore((state) => state.lines);
  return hydrated ? lines.reduce((sum, line) => sum + line.quantity, 0) : 0;
}

/** Lines, empty until the device's copy has been read. */
export function useCartLines(): { lines: CartLine[]; hydrated: boolean } {
  const hydrated = useStoreHydrated(useCartStore);
  const lines = useCartStore((state) => state.lines);
  return { lines: hydrated ? lines : [], hydrated };
}
