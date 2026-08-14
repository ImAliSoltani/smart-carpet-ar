import type { Metadata } from "next";

import { AskClient } from "./ask-client";

export const metadata: Metadata = {
  title: "پرسیدن به زبان خودتان",
  description:
    "به جای فیلتر کردن، جمله بنویسید: «فرش روشن برای اتاق کودک تا ده میلیون» — و همان فرش‌ها را ببینید.",
};

/**
 * Conversational search (ROADMAP §6-8).
 *
 * The sentence is translated into a catalogue filter and the catalogue answers;
 * nothing here is generated. That is why the page has no chat transcript and no
 * assistant voice — it would imply a conversation partner that knows the stock,
 * and the only thing on the other side is the same query the filter panel
 * builds.
 */
export default function AskPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
      <header className="mx-auto max-w-[720px] py-14 text-center sm:py-20">
        <p className="ltr-isolate mb-5 font-label text-[10.5px] font-medium uppercase tracking-[0.42em] text-muted">
          Ask
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.25] tracking-[-0.03em]">
          به زبان خودتان بپرسید
        </h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-[15px] leading-[2.1] text-muted sm:text-[17px]">
          لازم نیست با فیلترها ور بروید. همان جمله‌ای را بنویسید که به فروشنده
          می‌گفتید.
        </p>
      </header>

      <AskClient />
    </main>
  );
}
