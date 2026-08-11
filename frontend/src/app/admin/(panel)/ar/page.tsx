import * as React from "react";
import type { Metadata } from "next";

import { ArQueueView } from "./ar-view";

export const metadata: Metadata = { title: "بازبینی واقعیت افزوده" };

export default function AdminArPage() {
  return (
    <React.Suspense fallback={<div className="glass h-96 animate-pulse rounded-xl" />}>
      <ArQueueView />
    </React.Suspense>
  );
}
