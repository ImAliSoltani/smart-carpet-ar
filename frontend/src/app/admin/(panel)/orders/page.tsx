import * as React from "react";
import type { Metadata } from "next";

import { OrdersView } from "./orders-view";

export const metadata: Metadata = { title: "سفارش‌ها" };

export default function AdminOrdersPage() {
  return (
    // `useSearchParams` puts the tree into client rendering, and Next wants
    // the boundary named rather than inferred.
    <React.Suspense fallback={<div className="glass h-96 animate-pulse rounded-xl" />}>
      <OrdersView />
    </React.Suspense>
  );
}
