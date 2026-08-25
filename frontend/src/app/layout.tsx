import type { Metadata } from "next";
import { Vazirmatn, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { INTRO_HEAD_SCRIPT } from "@/components/toranjan/intro/intro-gate";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Persian carries every word of the interface, so it is the one face that is
// never allowed to fall back.
const vazirmatn = Vazirmatn({
  variable: "--font-fa",
  subsets: ["arabic", "latin"],
  display: "swap",
});

// Brand and display moments only — the wordmark, section openers.
const playfair = Playfair_Display({
  variable: "--font-lat-display",
  subsets: ["latin"],
  display: "swap",
});

// Latin labels and small caps.
const inter = Inter({
  variable: "--font-lat-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Without this every OpenGraph image ships as a relative path, and no crawler
  // resolves one — the product pages have carried real `og:image` tags for two
  // phases and none of them would have drawn a card. Next warns about it in the
  // build log, which is where it stayed unread.
  metadataBase: SITE_URL,
  title: {
    default: "ترنجان — فرش دستباف با ابعاد واقعی",
    // Every page used to append «— ترنجان» by hand, so introducing this meant
    // stripping it from all eleven of them or watching the shop's name arrive
    // twice per tab. The home page opts out with `absolute` — its title already
    // leads with the name — and «درباره‌ی ترنجان» became «درباره‌ی ما», which
    // is what it should have said once the suffix was doing that job.
    template: "%s — ترنجان",
  },
  description:
    "فرش را پیش از خرید با مقیاس واقعی روی کف خانه‌ی خودتان ببینید. جست‌وجوی بصری، مشاور چیدمان و راهنمای اندازه.",
  applicationName: SITE_NAME,
  /**
   * What turns «add to home screen» into an app rather than a bookmark.
   *
   * Reported by the shopkeeper: the panel installs properly and the shop only
   * seems to make a shortcut — and the two differ by exactly this line, which
   * `app/admin/layout.tsx` has carried since the panel became installable and
   * this file never had.
   *
   * `capable` is the one that does the work on iOS. Safari has honoured the
   * manifest's `display: standalone` only since 16.4 and not consistently
   * before that; without the meta tag an added icon opens the site back inside
   * Safari, with its address bar and its tabs, which is precisely what a
   * shortcut looks like. The manifest stays the source of truth everywhere
   * else — this is the platform that does not read it.
   *
   * `title` because the home screen labels the icon from it, and «ترنجان — فرش
   * دستباف با ابعاد واقعی» is a sentence, not a label; iOS truncates it to
   * about a dozen characters and the useful half is the first word.
   *
   * `default` for the status bar, not the panel's `black-translucent`: that
   * value asks the page to draw *under* the clock, which suits a dark panel
   * whose own ground continues up there and would put the shop's header
   * behind the status bar instead.
   */
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "fa_IR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} ${playfair.variable} ${inter.variable} h-full antialiased`}
      // The entrance gate stamps `data-intro` on this element before hydration,
      // so the server's HTML and the client's DOM disagree here by design —
      // that is the entire point of running it early. Without this React
      // reports a hydration mismatch it cannot patch, and the warning would sit
      // in the console for good, training everyone to ignore the console.
      suppressHydrationWarning
    >
      {/* No <head> of our own any more. It held one thing: a render-blocking
          stylesheet on api.fontshare.com for Satoshi, which set latin figures
          in about eight places. A third-party origin on the critical rendering
          path is a poor trade for eight tracking codes and a phone number — and
          self-hosting it instead turned out not to be ours to do. See the note
          over `--font-figure` in globals.css. */}
      {/* Decides whether the entrance runs, before the body is parsed.
          It has to be blocking: the stylesheet holds the shop one screen below
          the fold based on the attribute this sets, and anything React does
          happens after hydration — by which time the shop has been seen and is
          then covered, which is worse than never gating at all. Kept
          dependency-free and wrapped in try/catch, because a throw here is a
          blank site.

          A plain inline script as the first thing in <body>, and both halves of
          that were arrived at by trying the alternatives:

          - `next/script` with `beforeInteractive` hoists into <head>, and the
            DOM does end up right — but React 19's development validator judges
            the tag by where it was *declared* and reports three errors,
            including «<html> cannot contain a nested <script>» and a hydration
            error that never actually happens. A warning nobody can fix is a
            warning everybody learns to scroll past.
          - A literal <head> around it is the other common shape, and App Router
            would rather own that element.

          First child of <body> is simply legal: it runs during parse, before
          any of the shop below it exists, which is all this needs. It does not
          re-run on a client-side navigation, and it should not — somebody
          already inside the shop is not arriving. */}
      {/* The document, the fonts and the query client — everything both the shop
          and the panel need. The shop's own chrome moved down into `(shop)`,
          because it was reaching places it had no business being: the admin
          login page rendered under a storefront header, a footer of shop links
          and a compare tray still carrying somebody's shortlist. */}
      <body className="min-h-full flex flex-col">
        <script id="intro-gate" dangerouslySetInnerHTML={{ __html: INTRO_HEAD_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
