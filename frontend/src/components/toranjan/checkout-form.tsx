"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { createOrder } from "@/lib/api/orders";
import { formatNumber, formatSize } from "@/lib/format";
import { useCartLines, useCartStore } from "@/lib/store/cart";
import type { OrderOut } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Guest checkout.
 *
 * From [arihantcodes/multistep-form](https://21st.dev/@arihantcodes_1f7b8c4d/components/multistep-form),
 * kept for its shape: a row of step dots over a progress bar, one card whose
 * contents slide as the step changes, and a footer of back / next that becomes
 * back / submit at the end.
 *
 * What changed:
 *
 * - **Six steps became three**, because there are only three things to ask.
 *   ROADMAP §4 buys nothing with an account, a delivery option or a payment
 *   method: it is a guest order, one delivery, and a simulated gateway. Steps
 *   that exist to look thorough are steps a shopper abandons.
 * - **`useState` per field became react-hook-form + zod** (§4), and the schema
 *   is the backend's own rules restated — same lengths, same phone pattern. A
 *   field that would fail server-side says so before the request is made,
 *   beside the field rather than in a banner at the top (§8).
 * - **Persian figures reach the phone field.** `normalizePhone` mirrors the
 *   backend's normaliser, so ۰۹۱۲… is a valid number here exactly as it is
 *   there. Without it the one thing every Iranian keyboard produces would be
 *   rejected as malformed.
 * - **The slide is mirrored.** The page reads right to left, so the arriving
 *   step comes from the left and the leaving one goes right — the registry's
 *   `x: 50` would slide the wrong way in an RTL page.
 * - **Its `toast` on success is gone.** A tracking reference is the only way
 *   back to a guest order and a toast disappears; it takes the whole screen
 *   instead.
 */

const STEPS = [
  { id: "contact", title: "تماس" },
  { id: "address", title: "نشانی" },
  { id: "review", title: "مرور و ثبت" },
] as const;

/** The backend's `normalize_phone`, restated so both ends agree. */
function normalizePhone(value: string): string {
  let cleaned = value.replace(/[\s-]/g, "");
  "۰۱۲۳۴۵۶۷۸۹".split("").forEach((d, i) => {
    cleaned = cleaned.replaceAll(d, String(i));
  });
  "٠١٢٣٤٥٦٧٨٩".split("").forEach((d, i) => {
    cleaned = cleaned.replaceAll(d, String(i));
  });
  return cleaned;
}

const schema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(3, "نام و نام خانوادگی را کامل بنویسید")
    .max(150, "نام بیش از اندازه بلند است"),
  customer_phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => /^(\+98|0)9\d{9}$/.test(v), "شماره‌ی موبایل معتبر نیست"),
  address: z
    .string()
    .trim()
    .min(10, "نشانی را با جزئیات بنویسید — شهر، خیابان، پلاک و واحد")
    .max(1000, "نشانی بیش از اندازه بلند است"),
  note: z.string().trim().max(1000, "یادداشت بیش از اندازه بلند است").optional(),
});

type CheckoutValues = z.input<typeof schema>;

/** Which fields each step owns, so «next» only validates what is on screen. */
const STEP_FIELDS: (keyof CheckoutValues)[][] = [
  ["customer_name", "customer_phone"],
  ["address", "note"],
  [],
];

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-ink-2">{label}</label>
      {children}
      {/* Beside the field, not gathered at the top: §8 asks for the error where
          the correction is made. `role="alert"` so it is also heard there. */}
      {error ? (
        <p role="alert" className="text-[12.5px] leading-loose text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] leading-loose text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function Confirmation({ order }: { order: OrderOut }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-confirm-tint text-confirm-tint-ink">
        <Check className="size-7" aria-hidden />
      </span>
      <h2 className="mt-6 text-2xl font-light">سفارش ثبت شد</h2>
      <p className="mt-3 text-sm leading-loose text-muted">
        برای هماهنگی تحویل با شما تماس گرفته می‌شود.
      </p>

      {/* The reference is the only way back to a guest order, so it is the
          largest thing on the screen rather than a line in a paragraph. */}
      <div className="mx-auto mt-8 w-fit rounded-lg border border-line-2 bg-bg px-7 py-5">
        <p className="text-[12px] tracking-[0.1em] text-muted">کد رهگیری</p>
        <p className="ltr-isolate mt-2 font-figure text-2xl tracking-[0.2em]">
          {order.reference}
        </p>
      </div>
      <p className="mt-4 text-[12.5px] leading-loose text-muted">
        این کد را نگه دارید. پیگیری سفارش با همین کد و شماره‌ی موبایل انجام می‌شود.
      </p>

      <Button asChild variant="outline" className="mt-8 h-12 rounded-full px-7">
        <Link href="/carpets">بازگشت به فروشگاه</Link>
      </Button>
    </div>
  );
}

export function CheckoutForm() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const { lines, hydrated } = useCartLines();
  const clearCart = useCartStore((state) => state.clear);

  const [step, setStep] = React.useState(0);
  const [placed, setPlaced] = React.useState<OrderOut | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { customer_name: "", customer_phone: "", address: "", note: "" },
  });

  const total = lines.reduce((sum, line) => {
    const unit = Number(line.unitPrice);
    return sum + (Number.isFinite(unit) ? unit * line.quantity : 0);
  }, 0);

  const goNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const parsed = schema.parse(values);
    try {
      const order = await createOrder({
        customer_name: parsed.customer_name,
        customer_phone: parsed.customer_phone,
        address: parsed.address,
        note: parsed.note || null,
        items: lines.map((line) => ({
          variant_id: line.variantId,
          quantity: line.quantity,
        })),
      });
      // Only after the server has the order. Clearing first would lose the
      // cart to a failed request, and there is no copy of it anywhere else.
      clearCart();
      setPlaced(order);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید.",
      );
    }
  });

  if (placed) return <Confirmation order={placed} />;

  if (!hydrated) {
    return <div className="h-80 animate-pulse rounded-xl border border-line bg-paper" aria-hidden />;
  }

  // Nothing to buy. Sending them back is more useful than an empty form, but
  // only after hydration — before it, every cart looks empty.
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-paper px-6 py-16 text-center">
        <p className="text-lg font-light">سبد خرید خالی است</p>
        <p className="mt-2 text-sm leading-loose text-muted">
          برای ثبت سفارش، اول فرشی را به سبد اضافه کنید.
        </p>
        <Button className="mt-7 h-12 rounded-full px-7" onClick={() => router.push("/carpets")}>
          دیدن فرش‌ها
        </Button>
      </div>
    );
  }

  const last = step === STEPS.length - 1;
  const values = form.getValues();

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* Progress. `justify-between` and a width that grows both follow the
          page direction on their own — in an RTL document the first dot is on
          the right and the bar fills leftwards, which is what «forward» looks
          like here. */}
      <div className="mb-9">
        <ol className="mb-3 flex justify-between">
          {STEPS.map((s, index) => (
            <li key={s.id} className="flex flex-col items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-3 rounded-full transition-colors duration-[--dur-feedback]",
                  index < step ? "bg-ink" : index === step ? "bg-ink ring-4 ring-ink/12" : "bg-line-2",
                )}
              />
              <span
                className={cn(
                  "text-[12px]",
                  index === step ? "text-ink" : "text-muted",
                )}
                aria-current={index === step ? "step" : undefined}
              >
                {s.title}
              </span>
            </li>
          ))}
        </ol>
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full bg-ink"
            initial={false}
            animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-paper p-5 sm:p-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 0 && (
              <div className="space-y-6">
                <Field label="نام و نام خانوادگی" error={form.formState.errors.customer_name?.message}>
                  <Input
                    autoComplete="name"
                    aria-invalid={Boolean(form.formState.errors.customer_name)}
                    {...form.register("customer_name")}
                  />
                </Field>
                <Field
                  label="شماره‌ی موبایل"
                  hint="برای هماهنگی تحویل و پیگیری سفارش. با ارقام فارسی هم می‌شود نوشت."
                  error={form.formState.errors.customer_phone?.message}
                >
                  <Input
                    // `tel`, not `number`: a number field strips the leading
                    // zero every Iranian mobile starts with.
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    aria-invalid={Boolean(form.formState.errors.customer_phone)}
                    {...form.register("customer_phone")}
                  />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <Field
                  label="نشانی تحویل"
                  hint="شهر، خیابان، کوچه، پلاک و واحد."
                  error={form.formState.errors.address?.message}
                >
                  <Textarea
                    autoComplete="street-address"
                    aria-invalid={Boolean(form.formState.errors.address)}
                    {...form.register("address")}
                  />
                </Field>
                <Field
                  label="یادداشت (اختیاری)"
                  hint="اگر نکته‌ای برای تحویل هست — ساعت مناسب، توضیح مسیر."
                  error={form.formState.errors.note?.message}
                >
                  <Textarea
                    className="min-h-[80px]"
                    aria-invalid={Boolean(form.formState.errors.note)}
                    {...form.register("note")}
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <ul className="divide-y divide-line">
                  {lines.map((line) => (
                    <li key={line.variantId} className="flex items-baseline justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="line-clamp-1 text-sm">{line.carpetName}</span>
                        <span className="mt-1 block text-[12px] text-muted">
                          {formatSize(line.widthCm, line.lengthCm)} · {formatNumber(line.quantity)} عدد
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">
                        {formatNumber(Number(line.unitPrice) * line.quantity)}
                        <span className="ms-1.5 text-[12px] text-muted">تومان</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-sm text-ink-2">جمع</span>
                  <span className="text-xl tabular-nums">
                    {formatNumber(total)}
                    <span className="ms-1.5 text-[12px] text-muted">تومان</span>
                  </span>
                </div>

                <dl className="space-y-2 rounded-lg bg-bg p-4 text-[13px] leading-loose">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-muted">تحویل به</dt>
                    <dd>{values.customer_name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-muted">تماس</dt>
                    <dd className="ltr-isolate">{normalizePhone(values.customer_phone ?? "")}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-muted">نشانی</dt>
                    <dd>{values.address}</dd>
                  </div>
                </dl>

                {/* §4 is explicit that the gateway is simulated, and the report
                    says so too. Saying it here as well means nobody reaches the
                    end expecting a payment page. */}
                <p className="text-[12.5px] leading-loose text-muted">
                  پرداخت هنگام تحویل هماهنگ می‌شود؛ در این نسخه درگاه بانکی متصل نیست.
                </p>

                {submitError && (
                  <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm leading-loose text-destructive">
                    {submitError}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0 || form.formState.isSubmitting}
            className="h-12 gap-1 rounded-full px-5"
          >
            <ChevronRight className="size-4" />
            بازگشت
          </Button>

          {last ? (
            <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 gap-2 rounded-full px-7">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  در حال ثبت…
                </>
              ) : (
                <>
                  ثبت سفارش
                  <Check className="size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} className="h-12 gap-1 rounded-full px-7">
              ادامه
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-muted">
        گام {formatNumber(step + 1)} از {formatNumber(STEPS.length)}
      </p>
    </form>
  );
}
