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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
