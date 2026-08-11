import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditCarpet } from "./edit-carpet";

export const metadata: Metadata = { title: "ویرایش فرش" };

export default async function AdminCarpetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carpetId = Number(id);
  if (!Number.isInteger(carpetId) || carpetId < 1) notFound();

  return <EditCarpet carpetId={carpetId} />;
}
