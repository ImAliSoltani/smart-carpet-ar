import type { Metadata } from "next";

import { CompareTable } from "./compare-table";

export const metadata: Metadata = {
  title: "مقایسه‌ی فرش‌ها",
  // Like the cart and the favourites, this table is assembled from a list that
  // exists only on the reader's device. There is nothing here for an index.
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <h1 className="mb-2 text-3xl font-light tracking-tight">مقایسه‌ی فرش‌ها</h1>
      <p className="mb-8 text-sm leading-loose text-muted">
        هرچه دو فرش را از هم جدا می‌کند، در یک نگاه.
      </p>
      <CompareTable />
    </main>
  );
}
