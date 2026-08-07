import type { Metadata } from "next";
import Link from "next/link";

import { FaqAccordion } from "@/components/toranjan/faq-accordion";
import { FAQ_ITEMS } from "@/lib/content/faq";

/**
 * The questions page (§6-12).
 *
 * A server component on purpose: the answers are the page, and the accordion
 * keeps every one of them in the document at every state — a closed panel goes
 * to zero height rather than unmounting. So the whole page is in the HTML that
 * arrives, which is what makes it worth indexing and what makes find-in-page
 * work on a page whose entire job is answering a question the visitor already
 * has in mind.
 */

export const metadata: Metadata = {
  title: "سؤال‌های پرتکرار",
  description:
    "دیدن فرش با ابعاد واقعی در خانه، ثبت سفارش بدون حساب کاربری، پیگیری با کد رهگیری — و آنچه این نسخه هنوز انجام نمی‌دهد.",
};

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-12 sm:px-8 sm:pt-16">
      <header className="mb-12 sm:mb-16">
        <p className="mb-4 text-[11px] tracking-[0.18em] text-muted">راهنما</p>
        <h1 className="text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          سؤال‌های پرتکرار
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-loose text-ink-2">
          بیشترشان درباره‌ی همان کاری است که ترنجان را از یک فروشگاه معمولی جدا می‌کند:
          دیدن فرش با ابعاد واقعی، روی کف خانه‌ی خودتان.
        </p>
      </header>

      <FaqAccordion items={FAQ_ITEMS} />

      {/* Every questions page eventually meets a question it does not have. The
          honest end of one is the way to ask a person, not another link into
          the same list. */}
      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-xl font-light tracking-tight">پاسخ‌تان اینجا نبود؟</h2>
        <p className="mt-3 max-w-lg text-[14.5px] leading-loose text-muted">
          بپرسید. اگر درباره‌ی اندازه یا نقش فرش مردد هستید، همان سؤال را با عکس اتاق
          بفرستید.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex h-12 items-center rounded-md bg-cta px-7 text-[14px] text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
        >
          راه‌های تماس
        </Link>
      </section>
    </main>
  );
}
