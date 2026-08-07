import type { Metadata } from "next";
import { Vazirmatn, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/toranjan/site-header";
import { SiteFooter } from "@/components/toranjan/site-footer";
import { CompareTray } from "@/components/toranjan/compare-tray";
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
      <head>
        {/* Satoshi carries latin figures only. It is not on Google Fonts, so it
            comes from Fontshare for now; self-hosting it subset to digits is a
            task of its own before deployment. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
          {/* Outside the page, because a shortlist survives navigation — it is
              filled on one page and read on another. It draws nothing until
              something is in it. */}
          <CompareTray />
        </Providers>
      </body>
    </html>
  );
}
