import { ProductCard } from "@/components/ui/product-card";
import { AddToCart } from "@/components/toranjan/add-to-cart";

/**
 * Design-system check.
 *
 * Not a storefront page — it exists to prove the groundwork holds: that the
 * three latin faces and Vazirmatn all load, that the palette reaches a
 * component imported from the catalogue without that component bringing its
 * own colours, and that RTL is clean. The real home page replaces it.
 */

const TOKENS: [string, string, string][] = [
  ["زمینه", "--bg", "#FAFAFA"],
  ["کاغذ", "--paper", "#FFFFFF"],
  ["متن", "--ink", "#18181B"],
  ["متن دوم", "--ink-2", "#3F3F46"],
  ["متن ثانویه", "--muted", "#72727A"],
  ["خط", "--line", "#E9E9EB"],
  ["تأکید", "--accent", "#A16207"],
  ["سطح اقدام", "--cta", "#18181B"],
];

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-10">
      <p className="mb-6 flex items-baseline gap-3 text-xs text-muted">
        <span className="ltr-isolate font-figure tracking-widest text-accent">
          {n}
        </span>
        <span className="tracking-widest">{title}</span>
      </p>
      {children}
    </section>
  );
}

export default function DesignCheck() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8">
      <p className="ltr-isolate mb-5 font-label text-[10.5px] uppercase tracking-[0.42em] text-muted">
        Toranjan · Design system check
      </p>
      <h1 className="text-4xl font-light tracking-tight sm:text-5xl">ترنجان</h1>
      <p className="mt-4 max-w-prose leading-loose text-muted">
        این صفحه بخشی از فروشگاه نیست. فقط بررسی می‌کند که قلم‌ها، توکن‌های رنگ و
        راست‌به‌چپ درست نشسته‌اند.
      </p>

      <Section n="01" title="قلم‌ها">
        <div className="space-y-5">
          <p className="text-2xl">
            وزیرمتن — فرش دستباف اصفهان نقش لچک‌ترنج، ۲۴٫۸۰۰٫۰۰۰ تومان
          </p>
          <p className="ltr-isolate font-display text-3xl">
            Playfair Display — TORANJAN
          </p>
          <p className="ltr-isolate font-label text-sm uppercase tracking-[0.3em]">
            Inter — collection · hand-knotted
          </p>
          <p className="ltr-isolate font-figure text-2xl tracking-wider">
            Satoshi — 0123456789 · 300 × 400 CM
          </p>
        </div>
      </Section>

      <Section n="02" title="توکن‌های رنگ">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOKENS.map(([label, name, hex]) => (
            <li key={name} className="rounded-lg border border-line p-3">
              <span
                className="mb-3 block h-12 w-full rounded border border-line-2"
                style={{ background: `var(${name})` }}
              />
              <p className="text-sm">{label}</p>
              <p className="ltr-isolate font-figure text-[11px] text-muted">
                {hex}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section n="03" title="حالت تأیید — کدام؟">
        <p className="mb-7 max-w-prose text-sm leading-loose text-muted">
          روی هر سه بزن. حالت پیش از انتخاب یکی است؛ فقط لحظه‌ی تأیید فرق می‌کند و
          حدود دو ثانیه می‌ماند. رنگ از لبه می‌آید، نه با یک پرش.
        </p>
        <div className="grid gap-7 sm:grid-cols-3">
          {(
            [
              ["الف", "solid", "طلایی توپر — گرم‌ترین و صریح‌ترین"],
              ["ب", "tint", "طلایی کم‌رنگ — همان گرما، آرام‌تر"],
              ["ج", "quiet", "زغالی، فقط تیک طلایی — ساکت‌ترین"],
            ] as const
          ).map(([tag, style, note]) => (
            <div key={style}>
              <p className="mb-3 flex items-baseline gap-2 text-xs text-muted">
                <span className="text-accent">{tag}</span>
                <span>{note}</span>
              </p>
              <AddToCart confirmStyle={style} />
              <div className="mt-3">
                <AddToCart confirmStyle={style} holdConfirmed />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-loose text-muted">
          ردیف بالا زنده است — بزن تا کل توالی را ببینی. ردیف پایین همان حالت تأیید
          را باز نگه داشته تا بشود سه‌تا را کنار هم مقایسه کرد.
        </p>
      </Section>

      <Section n="04" title="کامپوننت واردشده، با پالت ما">
        <p className="mb-6 max-w-prose text-sm leading-loose text-muted">
          کارت زیر دست‌نخورده از کاتالوگ ۲۱st آمده و هنوز به فارسی و راست‌به‌چپ
          تطبیق داده نشده. آنچه اینجا اثبات می‌شود این است که رنگ‌هایش از
          توکن‌های ترنجان می‌آید، نه از پیش‌فرض‌های خودش.
        </p>
        <div className="ltr-isolate">
          <ProductCard
            name="Isfahan Lachak-Toranj"
            price={24.8}
            originalPrice={29.9}
            images={["/next.svg", "/vercel.svg"]}
            colors={["#18181B", "#A16207", "#72727A"]}
            sizes={["150×225", "200×300", "250×350"]}
          />
        </div>
      </Section>
    </main>
  );
}
