import type { Metadata } from "next";
import { Vazirmatn, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
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
    >
      {/* No <head> of our own any more. It held one thing: a render-blocking
          stylesheet on api.fontshare.com for Satoshi, which set latin figures
          in about eight places. A third-party origin on the critical rendering
          path is a poor trade for eight tracking codes and a phone number — and
          self-hosting it instead turned out not to be ours to do. See the note
          over `--font-figure` in globals.css. */}
      {/* The document, the fonts and the query client — everything both the shop
          and the panel need. The shop's own chrome moved down into `(shop)`,
          because it was reaching places it had no business being: the admin
          login page rendered under a storefront header, a footer of shop links
          and a compare tray still carrying somebody's shortlist. */}
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
