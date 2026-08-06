import type { Metadata } from "next";
import Link from "next/link";

/**
 * درباره‌ی ترنجان (§6-12).
 *
 * The page the header has been pointing at since the navigation was built, and
 * which answered with a 404 until now.
 *
 * Typographic rather than illustrated, and that is the gallery direction rather
 * than a shortcut: every picture this shop owns is of a carpet, and a carpet
 * photograph on a page about the shop competes with the catalogue instead of
 * introducing it. Hairlines and space carry the structure, which is the same
 * thing the product pages do around the one image that matters.
 *
 * The sections are numbered for the same reason the questions page numbers its
 * rows — it gives a long column of prose a spine to hang on, and the two pages
 * then read as one voice.
 *
 * Nothing here is a claim the shop cannot keep. No founding year, no workshop,
 * no weavers: those would be the kind of invented biography the footer refused
 * when it left the Instagram link empty. What the page says instead is what is
 * demonstrably true — how the thing works, and what this version is.
 */

export const metadata: Metadata = {
  title: "درباره‌ی ترنجان",
  description:
    "چرا فرش را باید پیش از خرید در خانه‌ی خودتان دید، و چطور از یک عکس معمولی فرشی ساخته می‌شود که با ابعاد واقعی روی کف می‌نشیند.",
};

const SECTIONS = [
  {
    id: "why",
    title: "اندازه، تنها چیزی است که عکس نمی‌گوید",
    body: [
      "هر کسی که یک‌بار فرش خریده باشد این را می‌داند: فرش در مغازه یک اندازه به نظر می‌رسد و در خانه اندازه‌ای دیگر. عکس هم کمکی نمی‌کند — قاب عکس نسبت فرش به اتاق را حذف می‌کند و آنچه می‌ماند فقط نقش و رنگ است.",
      "ترنجان برای همین یک کار را جدی گرفته است: فرش را با ابعاد واقعی روی کف خانه‌ی خودتان بگذارد. نه یک مدل سه‌بعدی عمومی که روی صفحه بزرگ و کوچک شود، بلکه همان اندازه‌ای که می‌خرید، به همان اندازه‌ای که جا می‌گیرد.",
    ],
  },
  {
    id: "how",
    title: "از یک عکس تا فرشی که روی کف می‌نشیند",
    body: [
      "برای هر فرش یک عکس معمولی از نمای روبه‌رو کافی است. سامانه پرسپکتیو عکس را تصحیح می‌کند تا فرش صاف و از بالا دیده شود، بافت را در تفکیک‌پذیری بالا بیرون می‌کشد، و برای هر اندازه‌ی فروشیِ همان فرش یک فایل سه‌بعدی جداگانه می‌سازد — با ابعاد ثبت‌شده‌ی خودِ آن اندازه.",
      "یعنی فرشی که روی کف اتاق‌تان می‌بینید از روی عدد ساخته شده، نه از روی حدس. همین است که «۳ در ۴» را واقعاً سه در چهار می‌کند.",
    ],
  },
  {
    id: "version",
    title: "این نسخه چیست",
    body: [
      "ترنجان پروژه‌ی پایانی کارشناسی است و کاتالوگ فعلی‌اش برای نمایش و ارزیابی سامانه جمع شده، نه برای فروش. عکس‌ها و مشخصات از دو منبع عمومی می‌آیند: یک مجموعه‌داده‌ی فرش ایرانی و یک فروشگاه اینترنتی داخلی. پرداخت هم به درگاه بانکی متصل نیست.",
      "اما مسیر واقعی است. هر فرشی که اینجا می‌بینید از همان پایپ‌لاینی گذشته که موجودی یک فروشنده‌ی واقعی از آن می‌گذرد؛ چیزی برای نمایش دستکاری نشده است.",
    ],
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-28 pt-12 sm:px-8 sm:pt-16">
      <header className="mb-16 sm:mb-24">
        <p className="mb-4 text-[11px] tracking-[0.18em] text-muted">درباره</p>
        {/* Not the home page's headline. That one — «فرش را نمی‌شود از روی عکس
            خرید» — is doing its job two clicks away, and a visitor who arrives
            here from it should be told the next thing, not the same thing. */}
        <h1 className="max-w-xl text-3xl font-light leading-[1.35] tracking-tight sm:text-[40px] sm:leading-[1.3]">
          هر فرش، به اندازه‌ی واقعی‌اش، روی کف خانه‌ی شما.
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-loose text-ink-2">
          ترنجان فروشگاهی است که پیش از خرید، فرش را با ابعاد واقعی روی کف خانه‌ی
          خودتان می‌گذارد — داخل مرورگر، بدون نصب هیچ برنامه‌ای.
        </p>
      </header>

      <div className="border-t border-line">
        {SECTIONS.map((section, index) => (
          <section
            key={section.id}
            className="grid gap-4 border-b border-line py-10 sm:grid-cols-[3rem_1fr] sm:gap-8 sm:py-14"
          >
            {/* Persian figures, so no `font-figure` — see ui/README. */}
            <p aria-hidden="true" className="text-[13px] text-muted">
              {["۰۱", "۰۲", "۰۳"][index]}
            </p>
            <div>
              <h2 className="text-xl font-medium leading-relaxed tracking-tight sm:text-2xl">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className="mt-5 max-w-xl text-[14.5px] leading-loose text-ink-2"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-14 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/carpets"
          className="inline-flex h-12 items-center justify-center rounded-md bg-cta px-7 text-[14px] text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
        >
          دیدن فرش‌ها
        </Link>
        <Link
          href="/faq"
          className="inline-flex h-12 items-center justify-center rounded-md border border-line-2 px-7 text-[14px] text-ink-2 transition-colors duration-[--dur-feedback] hover:border-ink hover:text-ink"
        >
          سؤال‌های پرتکرار
        </Link>
      </section>
    </main>
  );
}
