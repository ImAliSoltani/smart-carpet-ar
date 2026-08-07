import { SiteHeader } from "@/components/toranjan/site-header";
import { SiteFooter } from "@/components/toranjan/site-footer";
import { CompareTray } from "@/components/toranjan/compare-tray";

/**
 * The shop's chrome.
 *
 * A route group, so nothing in the URLs changed: `/`, `/carpets`, `/cart` and
 * the rest are exactly where they were. What changed is that the header, the
 * footer and the compare tray stop at the edge of the shop instead of wrapping
 * the whole application — the admin login page was rendering inside a
 * storefront header, under a footer of shop links, with a compare tray floating
 * over it holding a shortlist from another session.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      {/* Outside the page, because a shortlist survives navigation — it is
          filled on one page and read on another. It draws nothing until
          something is in it. */}
      <CompareTray />
    </>
  );
}
