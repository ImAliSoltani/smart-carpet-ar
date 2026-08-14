import type { Metadata } from "next";

import { VisualSearchClient } from "./visual-search-client";

export const metadata: Metadata = {
  title: "جست‌وجوی بصری",
  description:
    "عکس فرشی که پسندیده‌اید بفرستید تا نزدیک‌ترین فرش‌های موجود را از روی نقش و رنگ پیدا کنیم.",
};

/**
 * The page the header has been pointing at since phase 3.
 *
 * Server-rendered down to the interaction, like every other page here: the
 * heading and the metadata are static, and only the part that holds a file
 * and a request is a client component.
 *
 * No `searchParams` and nothing shareable in the URL, unlike the catalogue.
 * The query here is a photograph on the visitor's own device — there is no
 * string that could stand for it, and inventing one would mean uploading and
 * keeping every picture anyone ever tried. The result is deliberately not a
 * link; the carpets in it are.
 */
export default function VisualSearchPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
      <header className="mx-auto max-w-[720px] py-14 text-center sm:py-20">
        <p className="ltr-isolate mb-5 font-label text-[10.5px] font-medium uppercase tracking-[0.42em] text-muted">
          Visual Search
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.25] tracking-[-0.03em]">
          فرشی را دیده‌اید و نمی‌دانید چه نامی دارد؟
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-[2.1] text-muted sm:text-[17px]">
          عکسش را بفرستید. نقش و رنگش را می‌خوانیم و نزدیک‌ترین فرش‌های موجود را
          نشان می‌دهیم.
        </p>
      </header>

      <VisualSearchClient />
    </main>
  );
}
