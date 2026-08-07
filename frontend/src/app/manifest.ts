import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/site";

/**
 * The installable shop (ROADMAP §۶-۱۳).
 *
 * `dir` and `lang` are here for the same reason the `<html>` tag has them: an
 * installed app is opened from the launcher with no page to inherit from, and
 * the splash screen draws the name before any of our CSS exists. Without them
 * «ترنجان» renders left-to-right for the one second the visitor is looking
 * straight at it.
 *
 * Two icon purposes, not one. `any` is the icon as drawn; `maskable` is the
 * same mark shrunk inside its own ground, because Android crops whatever it is
 * given to the launcher's shape and only guarantees the middle 80% survives. A
 * manifest that offers only `any` gets that icon cropped anyway — the pendants
 * are the first thing over the edge.
 *
 * `background_color` is the splash ground and `theme_color` is the system bar;
 * both are `--bg`, so the transition from launcher to shop has no seam in it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ترنجان — فرش دستباف با ابعاد واقعی",
    short_name: SITE_NAME,
    description:
      "فرش را پیش از خرید با مقیاس واقعی روی کف خانه‌ی خودتان ببینید. جست‌وجوی بصری، مشاور چیدمان و راهنمای اندازه.",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    // `standalone`, not `fullscreen`: the AR view hands off to the system
    // camera, and coming back to a page with no status bar reads as a crash.
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#FAFAFA",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
