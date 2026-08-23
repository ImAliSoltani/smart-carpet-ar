/**
 * The panel, installable as its own app.
 *
 * **Why a route handler and not `manifest.ts`.** Next's metadata convention for
 * a web manifest is a root-only file: `app/manifest.ts` becomes
 * `/manifest.webmanifest`, and a copy of it under `app/admin/` is not picked
 * up at all — it would simply never be served, which is the kind of nothing
 * that looks like a caching problem for an hour. A handler is explicit, and
 * the admin layout points its `<link rel="manifest">` straight at this path.
 *
 * **`scope` is the load-bearing field.** Without it an installed panel would
 * treat the whole origin as its own, so tapping a link out to the storefront
 * would keep the shopkeeper inside the panel's window wearing the panel's
 * theme colour. Scoped to `/admin`, anything outside opens in the browser
 * where it belongs.
 *
 * **`id` too.** Two manifests on one origin are told apart by `id`; leaving it
 * out lets the browser fall back to `start_url`, and a later change to
 * `start_url` would then be read as a *different app* — installing a duplicate
 * beside the one already on the home screen.
 *
 * The colours are the panel's own surface tokens rather than the shop's, so
 * the splash screen and the system bar match the screen that is about to
 * appear. The icons are the same mark drawn in the same tokens
 * (`scripts/build_brand_icons.py`): one logo, two themes, so a launcher
 * holding both shows a pale tile for the shop and a dark one for the panel.
 */

const MANIFEST = {
  id: "/admin",
  name: "مدیریت ترنجان",
  short_name: "مدیریت",
  description: "پنل مدیریت فروشگاه ترنجان — سفارش‌ها، فرش‌ها و بازبینی واقعیت افزوده.",
  lang: "fa",
  dir: "rtl",
  start_url: "/admin",
  scope: "/admin",
  display: "standalone",
  // `--bg` and `--ink` from the `[data-surface="admin"]` block in globals.css.
  background_color: "#14131A",
  theme_color: "#14131A",
  icons: [
    { src: "/brand/admin-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/brand/admin-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: "/brand/admin-icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
} as const;

export function GET() {
  return new Response(JSON.stringify(MANIFEST), {
    headers: {
      // The registered type. `application/json` works in Chrome and is refused
      // by the stricter installers, which is the worst way to find out.
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
