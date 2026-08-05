import type { Metadata } from "next";
import { Suspense } from "react";

import { TrackOrder } from "./track-order";

export const metadata: Metadata = {
  title: "پیگیری سفارش — ترنجان",
  description: "وضعیت سفارش را با کد رهگیری و شماره‌ی موبایل ببینید.",
};

export default function TrackPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-10 sm:px-8">
      <h1 className="mb-8 text-3xl font-light tracking-tight">پیگیری سفارش</h1>
      {/* `useSearchParams` opts its subtree into client rendering, and Next
          requires the boundary to be explicit rather than silently turning the
          whole page dynamic. */}
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl border border-line bg-paper" />}>
        <TrackOrder />
      </Suspense>
    </main>
  );
}
