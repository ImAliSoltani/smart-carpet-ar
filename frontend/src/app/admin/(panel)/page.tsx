import type { Metadata } from "next";

import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "داشبورد" };

export default function AdminDashboardPage() {
  return <DashboardView />;
}
