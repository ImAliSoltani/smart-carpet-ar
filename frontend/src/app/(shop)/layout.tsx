import { SiteHeader } from "@/components/toranjan/site-header";
import { SiteFooter } from "@/components/toranjan/site-footer";
import { CompareTray } from "@/components/toranjan/compare-tray";
import { BottomNav } from "@/components/toranjan/bottom-nav";
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
      {/* The bottom bar is `fixed`, so unlike the compare tray it does hover
          over the end of the page. Padding the footer is safe here for the
          reason it was not safe there: this bar's height is a constant — a
          44px row in 8px of padding — and does not move with the words inside
          it. Below `lg` only, which is exactly where the bar is drawn.

          `env()` is repeated rather than shared, because a spacer that ignores
          the gesture bar leaves the footer's last line under it on precisely
          the phones the bar was added for. */}
      <div
        aria-hidden
        className="lg:hidden"
        style={{ height: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
      />
      {/* Outside the page, because a shortlist survives navigation — it is
          filled on one page and read on another. It draws nothing until
          something is in it. */}
      <CompareTray />
      <BottomNav />
    </IntroCurtain>
  );
}
