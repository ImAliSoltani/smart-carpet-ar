import type { MetadataRoute } from "next";

import { PRIVATE_PATHS, SITE_URL } from "@/lib/site";

/**
 * What is worth crawling, and what is somebody's own session.
 *
 * The disallowed paths already answer `noindex` in their own metadata, and that
 * is the tag that keeps them out of results. This file is the cheaper half of
 * the same instruction: `noindex` is only read *after* the page is fetched and
 * rendered, so without this a crawler spends a request on an empty cart before
 * being told to forget it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
