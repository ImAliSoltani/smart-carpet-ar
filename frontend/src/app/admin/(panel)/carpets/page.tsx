import * as React from "react";
import type { Metadata } from "next";

import { CarpetsView } from "./carpets-view";

export const metadata: Metadata = { title: "فرش‌ها" };

export default function AdminCarpetsPage() {
  return (
    <React.Suspense fallback={<div className="glass h-96 animate-pulse rounded-xl" />}>
      <CarpetsView />
    </React.Suspense>
  );
}
