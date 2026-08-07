import type { Metadata } from "next";
import Link from "next/link";

import { contactChannels } from "@/lib/content/contact";
import { cn } from "@/lib/utils";

/**
 * تماس (§6-12).
 *
 * The roadmap asks for WhatsApp and Instagram here because that is how a small
 * Iranian shop is actually reached — not a ticket form. The channels come from
 * `lib/content/contact.ts`, which is empty until the shop has real accounts,
 * and this page renders whichever of them are filled in.
 *
 * Which leaves the empty case, and it is worth being deliberate about rather
 * than letting it fall out: a contact page with nothing on it is a dead end,
 * and a dead end is the one thing a contact page must not be. So when there is
 * no channel to show, the page says so plainly and sends the visitor to the two
 * places that answer most of the reasons anyone writes to a shop — where their
 * order is, and how the thing works. That is a smaller promise than a phone
 * number, and it is one this version can keep.
 *
 * The moment `CONTACT` is filled in, the notice goes and the channels take its
 * place. No edit here.
 */

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "راه‌های تماس با ترنجان، پیگیری سفارش و پاسخ سؤال‌های پرتکرار.",
};

export default function ContactPage() {
  const channels = contactChannels();

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-12 sm:px-8 sm:pt-16">
      <header className="mb-12 sm:mb-16">
        <p className="mb-4 text-[11px] tracking-[0.18em] text-muted">تماس</p>
        <h1 className="text-3xl font-light leading-tight tracking-tight sm:text-4xl">
          با ما حرف بزنید
        </h1>
        {/* The invitation only makes sense next to somewhere to send it. With
            no channel open, «بپرسید» is an instruction the page cannot carry
            out, so the empty state says what is true instead. */}
        <p className="mt-5 max-w-xl text-[15px] leading-loose text-ink-2">
          {channels.length > 0
            ? "درباره‌ی اندازه، نقش، یا فرشی که مطمئن نیستید به اتاق‌تان می‌آید یا نه — بپرسید. عکس اتاق را هم بفرستید، کمک می‌کند."
            : "ترنجان هنوز به فروش واقعی نرسیده و راه تماسی برای اعلام کردن ندارد. آنچه امروز کار می‌کند در ادامه آمده است."}
        </p>
      </header>

      {channels.length > 0 ? (
        <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
          {channels.map((channel) => (
            <li key={channel.id}>
              <a
                href={channel.href}
                {...(channel.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group flex h-full flex-col bg-paper p-6 transition-colors duration-[--dur-feedback] hover:bg-bg"
              >
                <span className="text-[15px] font-medium">{channel.label}</span>
                <span className="mt-2 text-[13.5px] leading-loose text-muted">
                  {channel.note}
                </span>
                {/* Latin runs reorder inside an RTL line once they mix letters,
                    figures and punctuation — a phone number is exactly that. */}
                <span
                  className={cn(
                    "mt-4 text-[14px] text-accent transition-colors duration-[--dur-feedback] group-hover:text-accent-strong",
                    channel.latin && "ltr-isolate font-figure",
                  )}
                >
                  {channel.display}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-line bg-paper p-6 text-[14px] leading-loose text-ink-2 shadow-panel">
          راه‌های تماس این فروشگاه هنوز باز نشده‌اند. تا آن زمان، دو کاری که بیشتر از
          همه سراغ‌شان می‌آیند بدون تماس هم انجام می‌شوند: دیدن وضعیت سفارش، و پاسخ
          سؤال‌های پرتکرار.
        </p>
      )}

      <section className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        <Link
          href="/track"
          className="flex flex-col bg-paper p-6 transition-colors duration-[--dur-feedback] hover:bg-bg"
        >
          <span className="text-[15px] font-medium">پیگیری سفارش</span>
          <span className="mt-2 text-[13.5px] leading-loose text-muted">
            با کد رهگیری و شماره‌ی موبایل، بدون حساب کاربری.
          </span>
        </Link>
        <Link
          href="/faq"
          className="flex flex-col bg-paper p-6 transition-colors duration-[--dur-feedback] hover:bg-bg"
        >
          <span className="text-[15px] font-medium">سؤال‌های پرتکرار</span>
          <span className="mt-2 text-[13.5px] leading-loose text-muted">
            واقعیت افزوده چطور کار می‌کند، و ثبت سفارش چه مسیری دارد.
          </span>
        </Link>
      </section>
    </main>
  );
}
