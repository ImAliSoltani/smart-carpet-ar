import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArReview } from "./ar-review";

export const metadata: Metadata = { title: "بازبینی واقعیت افزوده" };

export default async function AdminArReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carpetId = Number(id);
  // Same reasoning as the order page: `Number("abc")` is `NaN`, which matches
  // nothing, so this is a 404 now rather than «پیدا نشد» after a round trip.
  if (!Number.isInteger(carpetId) || carpetId < 1) notFound();

  return <ArReview carpetId={carpetId} />;
}
