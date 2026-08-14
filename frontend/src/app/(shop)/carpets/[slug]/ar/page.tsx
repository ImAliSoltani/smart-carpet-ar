import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArClient } from "./ar-client";
import { getCarpet } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";

type Params = { slug: string };
type Search = { variant?: string };

async function carpetOr404(slug: string) {
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
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const carpet = await getCarpet(slug);
    return {
      title: `${carpet.name} در خانه‌ی شما`,
      description: "همین فرش را با ابعاد واقعی روی کف خانه‌ی خودتان ببینید.",
      // Nothing to index: the page is a camera session that only means anything
      // on the device holding it, and its content is the room in front of you.
      robots: { index: false, follow: true },
    };
  } catch {
    return { title: "در خانه‌ی من ببین" };
  }
}

/**
 * The AR page (ROADMAP §6-4).
 *
 * The placement layer itself came from the spike and is device-verified; what
 * this page adds is everything around it that a shop needs and a spike did not:
 * the real catalogue's sizes, the first-time guide, and the way a visitor on a
 * desktop gets to their phone.
 *
 * Server-rendered down to the session, so the carpet's name and sizes are in
 * the HTML — which matters more here than elsewhere, because this is the page
 * most likely to be opened on a phone over a slow connection, standing in the
 * room, with the shop's word for what is about to happen.
 */
export default async function ArPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const [{ slug }, { variant }] = await Promise.all([params, searchParams]);
  const carpet = await carpetOr404(slug);

  // Only sizes whose assets actually exist. A size listed here that cannot be
  // placed is a button that fails after the camera is already open, which is
  // the worst possible moment to discover it.
  const placeable = carpet.variants
    .filter((v) => v.ar_status === "ready" && v.glb_url)
    .sort((a, b) => a.width_cm * a.length_cm - b.width_cm * b.length_cm);

  const requested = Number(variant);
  const startIndex = Math.max(
    0,
    placeable.findIndex((v) => v.id === requested),
  );

  return (
    <ArClient
      carpet={{ slug: carpet.slug, name: carpet.name }}
      variants={placeable}
      startIndex={startIndex}
    />
  );
}
