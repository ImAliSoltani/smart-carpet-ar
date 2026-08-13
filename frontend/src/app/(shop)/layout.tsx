import { SiteHeader } from "@/components/toranjan/site-header";
import { SiteFooter } from "@/components/toranjan/site-footer";
import { CompareTray } from "@/components/toranjan/compare-tray";
import { IntroCurtain } from "@/components/toranjan/intro/intro-curtain";

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
    // The entrance wraps the shop's chrome, not just the page: the curtain that
    // rises is the whole storefront — header included — coming up over the dark
    // film. Wrapping only the page body would raise the content and leave the
    // header sitting on top of the film the entire time.
    //
    // It draws nothing anywhere but «/», and the head script settles that
    // before the first paint.
    <IntroCurtain>
      <SiteHeader />
      {children}
      <SiteFooter />
      {/* Outside the page, because a shortlist survives navigation — it is
          filled on one page and read on another. It draws nothing until
          something is in it. */}
      <CompareTray />
    </IntroCurtain>
  );
}
