import type { Metadata } from "next";

import { CartView } from "@/components/toranjan/cart-view";

export const metadata: Metadata = {
  title: "سبد خرید",
  // A cart is this device's alone, so there is nothing here for a crawler to
  // hold on to and nothing anyone gains by finding it in a search result.
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8">
      <h1 className="mb-8 text-3xl font-light tracking-tight">سبد خرید</h1>
      <CartView />
    </main>
  );
}
