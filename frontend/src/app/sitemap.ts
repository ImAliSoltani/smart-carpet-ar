import type { MetadataRoute } from "next";

import { listCarpets } from "@/lib/api/catalog";
import { SITE_URL } from "@/lib/site";

/**
 * Every page worth finding (ROADMAP §۶-۱۳).
 *
 * Regenerated hourly rather than frozen at build: a carpet added through the
 * admin panel should be findable without a redeploy, and an hour is well inside
 * how often a crawler comes back.
 */
export const revalidate = 3600;

/** The static half — everything that is not a carpet. */
const PAGES: { path: string; priority: number; frequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, frequency: "weekly" },
  { path: "/carpets", priority: 0.9, frequency: "daily" },
  { path: "/about", priority: 0.5, frequency: "yearly" },
  { path: "/contact", priority: 0.5, frequency: "yearly" },
  { path: "/faq", priority: 0.5, frequency: "monthly" },
];

/**
 * The whole catalogue, page by page.
 *
 * `page_size` is capped at 60 by the endpoint and the catalogue is already 70
 * carpets, so a single request quietly returns most of the shop and the rest
 * would never be submitted. The loop reads `total` and keeps asking.
 *
 * The guard is not paranoia about the number: it is that this runs during
 * `next build`, and a build is exactly when the API is least likely to be up —
 * CI builds the frontend with no backend beside it. A sitemap missing its
 * carpets costs a crawl; a build that dies because a fetch failed costs the
 * deploy.
 */
async function carpetEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    for (let page = 1; ; page += 1) {
      const result = await listCarpets({ page, page_size: 60, sort: "newest" });

      for (const carpet of result.items) {
        entries.push({
          url: new URL(`/carpets/${carpet.slug}`, SITE_URL).toString(),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }

      if (entries.length >= result.total || result.items.length === 0) break;
    }
  } catch (error) {
    // Named, not swallowed. A build log that says the sitemap came out short is
    // the only way anyone finds out before a crawler does.
    console.warn(
      `sitemap: the catalogue could not be read, so ${entries.length} carpet URLs were written instead of all of them.`,
      error,
    );
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  return [
    ...PAGES.map(({ path, priority, frequency }) => ({
      url: new URL(path, SITE_URL).toString(),
      lastModified: now,
      changeFrequency: frequency,
      priority,
    })),
    ...(await carpetEntries()),
  ];
}
