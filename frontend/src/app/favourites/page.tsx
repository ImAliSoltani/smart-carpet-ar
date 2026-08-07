import type { Metadata } from "next";

import { FavouritesGrid } from "./favourites-grid";

export const metadata: Metadata = {
  title: "علاقه‌مندی‌ها",
  // Like the cart, this list exists only on the reader's device.
  robots: { index: false, follow: true },
};

export default function FavouritesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <h1 className="mb-8 text-3xl font-light tracking-tight">علاقه‌مندی‌ها</h1>
      <FavouritesGrid />
    </main>
  );
}
