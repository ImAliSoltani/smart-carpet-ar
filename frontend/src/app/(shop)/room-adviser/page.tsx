import type { Metadata } from "next";

import { RoomAdviserClient } from "./room-adviser-client";

export const metadata: Metadata = {
  title: "مشاور چیدمان",
  description:
    "عکس اتاقتان را بفرستید تا رنگ کف و دیوارها را بخوانیم و بگوییم کدام فرش به آن می‌آید — و چرا.",
};

/**
 * Conversational search asks what you want; this asks what your room wants.
 *
 * Nothing here is generated: the reasons are the rules that produced the
 * ranking, written out. That is why the page can promise «و چرا» in its
 * subtitle without the promise being a figure of speech.
 */
export default function RoomAdviserPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
      <header className="mx-auto max-w-[720px] py-14 text-center sm:py-20">
        <p className="ltr-isolate mb-5 font-label text-[10.5px] font-medium uppercase tracking-[0.42em] text-muted">
          Room Adviser
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.25] tracking-[-0.03em]">
          کدام فرش به اتاق شما می‌آید؟
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-[2.1] text-muted sm:text-[17px]">
          عکس اتاق را بفرستید. رنگ کف و رنگ دیوار و مبلمان را جدا می‌خوانیم و
          برای هر پیشنهاد می‌گوییم چرا.
        </p>
      </header>

      <RoomAdviserClient />
    </main>
  );
}
