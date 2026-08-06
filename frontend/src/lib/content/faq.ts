import type { FaqEntry } from "@/components/toranjan/faq-accordion";

/**
 * The questions this shop can actually answer.
 *
 * The list is short on purpose. A carpet shop's FAQ usually opens with
 * delivery times, returns windows and warranty terms — and every one of those
 * is a promise a business makes, not a fact about a piece of software. There is
 * no business behind this catalogue yet, so writing them would be inventing
 * them. The footer took the same line with the WhatsApp and Instagram links it
 * does not have; this file is that decision applied to prose.
 *
 * So every answer below is true of the system as it stands today, including the
 * two that are unflattering: the gateway is simulated, and the catalogue was
 * assembled from public sources. Those are in the roadmap as things the thesis
 * has to state plainly (§4 payment, §7 data), and a visitor deserves them
 * before an order, not after.
 *
 * Kept as plain data rather than JSX so the server component that renders the
 * page can hand it straight to the client accordion. `link` exists because the
 * one thing an answer often needs is a way onward, and a bare string cannot
 * carry one.
 */
export const FAQ_ITEMS: readonly FaqEntry[] = [
  {
    id: "ar-how",
    question: "«در خانه‌ی من ببینید» چطور کار می‌کند؟",
    answer:
      "روی صفحه‌ی هر فرش، اندازه‌ای را که می‌خواهید انتخاب کنید و دکمه‌ی «در خانه‌ی من ببینید» را بزنید. مرورگر گوشی دوربین را باز می‌کند، کف اتاق را پیدا می‌کند و همان فرش را روی آن می‌گذارد. با یک انگشت جابه‌جایش کنید و با دو انگشت بچرخانیدش. پردازش تصویر دوربین روی خود گوشی انجام می‌شود و تصویری از خانه‌ی شما برای ما فرستاده نمی‌شود.",
    link: { href: "/carpets", label: "یک فرش انتخاب کنید" },
  },
  {
    id: "ar-install",
    question: "برای دیدن فرش در خانه باید برنامه‌ای نصب کنم؟",
    answer:
      "خیر. همه‌چیز داخل مرورگر خود گوشی اتفاق می‌افتد و چیزی نصب نمی‌شود. اگر صفحه را روی کامپیوتر باز کرده‌اید، همان دکمه یک کد QR به شما می‌دهد؛ آن را با دوربین گوشی بگیرید تا همین فرش روی گوشی باز شود و لازم نباشد آدرس را دوباره پیدا کنید.",
  },
  {
    id: "ar-scale",
    question: "اندازه‌ای که روی کف می‌بینم واقعی است؟",
    answer:
      "بله، و این تفاوت اصلی ترنجان با نمایش‌های سه‌بعدی معمول است. برای هر اندازه‌ی فروشیِ هر فرش یک فایل سه‌بعدی جداگانه از روی ابعاد ثبت‌شده‌ی همان اندازه ساخته می‌شود، نه یک مدل عمومی که روی صفحه بزرگ و کوچک شود. یعنی فرشی که روی کف می‌بینید همان‌قدر جا می‌گیرد که فرش واقعی می‌گیرد؛ اگر با متر اندازه بگیرید باید با اندازه‌ی نوشته‌شده روی همان فرش بخواند.",
  },
  {
    id: "ar-iphone",
    question: "روی آیفون هم کار می‌کند؟",
    answer:
      "بله. روی iOS نمایش با Quick Look خود سیستم‌عامل باز می‌شود و روی اندروید داخل مرورگر. برای هر فرش هر دو قالب ساخته می‌شود و ابعادشان یکی است، پس اندازه‌ای که روی آیفون می‌بینید با اندازه‌ای که روی اندروید دیده می‌شود فرق نمی‌کند.",
  },
  {
    id: "ar-unsupported",
    question: "اگر گوشی‌ام واقعیت افزوده را پشتیبانی نکند چه؟",
    answer:
      "همان دکمه به نمای سه‌بعدی می‌رود: فرش را می‌توانید بچرخانید و از هر زاویه ببینید، فقط روی کف اتاق شما نمی‌نشیند. گالری عکس‌های هر فرش هم با بزرگنمایی تمام‌صفحه باز می‌شود تا بافت و نقش را از نزدیک ببینید.",
  },
  {
    id: "order-account",
    question: "برای ثبت سفارش باید حساب کاربری بسازم؟",
    answer:
      "خیر. ترنجان ثبت‌نام ندارد. سبد را که بستید، نام و شماره‌ی موبایل و نشانی را می‌نویسید و سفارش ثبت می‌شود. در پایان یک کد رهگیری می‌گیرید که کلید دسترسی شما به سفارش است — جایی یادداشتش کنید.",
    link: { href: "/cart", label: "سبد خرید" },
  },
  {
    id: "order-track",
    question: "سفارشم را چطور پیگیری کنم؟",
    answer:
      "با همان کد رهگیری، به‌همراه شماره‌ی موبایلی که هنگام ثبت سفارش وارد کرده‌اید. چون حساب کاربری در کار نیست، این دو با هم جای ورود به حساب را می‌گیرند.",
    link: { href: "/track", label: "پیگیری سفارش" },
  },
  {
    id: "payment",
    question: "پرداخت چطور انجام می‌شود؟",
    answer:
      "این نسخه از ترنجان به درگاه بانکی متصل نیست. سفارش تا مرحله‌ی ثبت و صدور کد رهگیری کامل پیش می‌رود، اما مبلغی از حساب شما کم نمی‌شود. اتصال به درگاه واقعی شخصیت حقوقی می‌خواهد و بیرون از دامنه‌ی این نسخه است.",
  },
  {
    id: "catalogue-source",
    question: "عکس‌ها و مشخصات فرش‌ها از کجا آمده‌اند؟",
    answer:
      "کاتالوگ این نسخه از دو منبع عمومی جمع شده است: یک مجموعه‌داده‌ی فرش ایرانی و یک فروشگاه اینترنتی داخلی. هدفش نمایش و ارزیابی سامانه است، نه فروش. همه‌ی فرش‌ها از همان مسیری گذشته‌اند که یک فرش واقعی می‌گذرد — یعنی هر چه اینجا می‌بینید روی موجودی واقعی هم همان‌طور کار می‌کند.",
    link: { href: "/about", label: "درباره‌ی ترنجان" },
  },
];
