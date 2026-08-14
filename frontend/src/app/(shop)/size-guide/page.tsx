import type { Metadata } from "next";

import { SizeGuideClient } from "./size-guide-client";

export const metadata: Metadata = {
  title: "راهنمای اندازه",
  description:
    "عکس اتاقتان را بفرستید تا کف آزادش اندازه گرفته شود و بدانید کدام اندازه‌ی فرش در آن جا می‌شود.",
};

/**
 * The size guide (ROADMAP §6-7).
 *
 * Server-rendered down to the interaction, like the rest of the shop. Nothing
 * here is shareable by URL for the same reason visual search is not: the query
 * is a photograph on the visitor's own device, and there is no string that
 * could stand for it.
 */
export default function SizeGuidePage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
      <header className="mx-auto max-w-[720px] py-14 text-center sm:py-20">
        <p className="ltr-isolate mb-5 font-label text-[10.5px] font-medium uppercase tracking-[0.42em] text-muted">
          Size Guide
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.25] tracking-[-0.03em]">
          چه اندازه‌ای در اتاق شما جا می‌شود؟
        </h1>
        <p className="mx-auto mt-5 max-w-[48ch] text-[15px] leading-[2.1] text-muted sm:text-[17px]">
          فرش کوچک‌تر از اندازه، رایج‌ترین اشتباه خرید فرش است. یک عکس از اتاقتان
          بفرستید تا کف آزادش را اندازه بگیریم و بگوییم کدام اندازه در آن می‌نشیند.
        </p>
      </header>

      <SizeGuideClient />
    </main>
  );
}
