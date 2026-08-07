import type { Metadata } from "next";

/**
 * Everything under `/admin`, kept out of search.
 *
 * `robots.txt` already asks crawlers not to fetch these (`PRIVATE_PATHS`), and
 * this is the half that holds if one fetches anyway. The shell lives one level
 * down in the `(panel)` group so the login page can render without it — a page
 * whose whole job is to exist before there is a session.
 */
export const metadata: Metadata = {
  // Overrides the root template, which appends «— ترنجان» to sell the shop.
  // Nobody arrives at this tab from a search result; the useful thing for it to
  // say is which of several open tabs is the panel.
  // `absolute`, not `default`. A nested `default` is still fed through the
  // parent's template, so the tab read «پنل مدیریت ترنجان — ترنجان»; only
  // `absolute` steps out of it. `template` still applies to the pages below.
  title: { absolute: "پنل مدیریت ترنجان", template: "%s — مدیریت ترنجان" },
  robots: { index: false, follow: false },
};

/**
 * `data-surface="admin"` is the whole theme switch.
 *
 * Every colour token is redefined under that attribute in `globals.css`, so
 * the table, the badges, the buttons and the inputs — all of which already
 * read those names — turn dark without one of them being edited. It is the
 * escape hatch the roadmap built when it decided the shop would be light «اما
 * توکن‌ها از ابتدا متغیر تعریف می‌شوند تا افزودن تیره بعداً بازنویسی نباشد».
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    // The tokens live here; the ground does not. The panel and the login page
    // want the same photograph at very different strengths — one is a surface
    // to work on, the other is the picture itself — so each applies its own
    // ground class. Scrims multiply rather than add, so layering a second one
    // over a shared base turns the photograph black.
    <div data-surface="admin" className="min-h-dvh text-ink">
      {children}
    </div>
  );
}
