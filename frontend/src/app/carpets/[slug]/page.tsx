import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/components/toranjan/product-detail";
import { SimilarCarpets } from "./similar-carpets";
import { getCarpet } from "@/lib/api/catalog";
import { ApiError, absoluteMediaUrl } from "@/lib/api/client";
import type { CarpetDetail } from "@/lib/api/types";
import { formatToman } from "@/lib/format";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";

/**
 * Fetched on the server, so the rug's name and photograph are in the HTML
 * rather than assembled after a round trip. This is the page a search engine
 * and a shared link both land on, and §6-13 asks for real metadata on it.
 *
 * A missing slug is a 404, not an error page: `getCarpet` throws `ApiError`
 * with the backend's own Persian sentence, and only that one status means
 * "there is no such rug" rather than "something went wrong".
 */
async function load(slug: string): Promise<CarpetDetail> {
  try {
    return await getCarpet(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let carpet: CarpetDetail;
  try {
    carpet = await getCarpet(slug);
  } catch {
    return { title: "فرش پیدا نشد — ترنجان" };
  }

  const cheapest = carpet.variants.reduce<number | null>(
    (low, v) => (low === null ? Number(v.price) : Math.min(low, Number(v.price))),
    null,
  );
  const description =
    carpet.description ??
    `${PATTERN_LABEL[carpet.pattern]} · ${MATERIAL_LABEL[carpet.material]}${
      cheapest ? ` · از ${formatToman(cheapest)}` : ""
    }`;
  const image = absoluteMediaUrl(
    carpet.images.find((i) => i.is_primary)?.url ?? carpet.images[0]?.url,
  );

  return {
    title: `${carpet.name} — ترنجان`,
    description,
    openGraph: {
      title: carpet.name,
      description,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function CarpetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const carpet = await load(slug);

  return (
    <main>
      <ProductDetail carpet={carpet} similar={<SimilarCarpets carpetId={carpet.id} />} />
    </main>
  );
}
