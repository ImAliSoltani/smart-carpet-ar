import type { Metadata } from "next";
import { Vazirmatn, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

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
  title: "ترنجان — فرش دستباف با ابعاد واقعی",
  description:
    "فرش را پیش از خرید با مقیاس واقعی روی کف خانه‌ی خودت ببین. جست‌وجوی بصری، مشاور چیدمان و راهنمای اندازه.",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
