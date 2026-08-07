/**
 * Where this shop lives, as an absolute URL.
 *
 * One place, because three separate things need the same answer and each of
 * them fails differently when it guesses: `metadataBase` (OpenGraph images
 * silently ship as relative paths, which no crawler resolves), `sitemap.ts`
 * (a sitemap of relative URLs is rejected outright), and `robots.ts`.
 *
 * There is no domain yet — that is a phase 5 item, together with the VPS. Until
 * one exists the fallback is the dev origin, which is correct for every
 * environment that currently runs: nothing is crawling localhost, and the
 * OpenGraph tags on a laptop should point at the laptop.
 *
 * Set `NEXT_PUBLIC_SITE_URL` at build time in production. Build time, not run
 * time: `metadataBase` and the sitemap are both baked into the static output,
 * so a value supplied only to the running container arrives too late.
 */
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const SITE_NAME = "ترنجان";

/**
 * The paths that exist for one device and one visitor.
 *
 * A cart, a shortlist and a favourites list are held in `localStorage`, so a
 * crawler fetching these gets the empty state and indexes a page that says the
 * shop has nothing in it. Checkout and tracking are worse: they are steps in
 * somebody's order.
 *
 * Each of these already carries `robots: { index: false }` in its own metadata.
 * This list is the second half of the same statement — `robots.txt` asks
 * crawlers not to *fetch* them at all, which is the only one of the two that a
 * crawler reads before spending the request.
 */
export const PRIVATE_PATHS = [
  "/cart",
  "/checkout",
  "/compare",
  "/favourites",
  "/track",
  // The panel. Every route under it refuses an unauthenticated request, so this
  // is not what keeps it shut — it is what keeps a login form out of search
  // results, and stops a crawler wandering the shop's back door at all.
  "/admin",
];
