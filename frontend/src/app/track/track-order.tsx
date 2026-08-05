"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Clock, Loader2, PackageSearch, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { trackOrder } from "@/lib/api/orders";
import { formatNumber, formatSize } from "@/lib/format";
import { IRANIAN_MOBILE, normalizePhone } from "@/lib/phone";
import { ORDER_STATUS } from "@/lib/taxonomy";
import type { OrderOut } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Order tracking (ROADMAP §6-10).
 *
 * Hand-built rather than adapted: it is one pair of fields and a result, and
 * every catalogue component for this shape carries an account, a carrier and a
 * map, none of which exist here.
 *
 * **The reference and the phone are the authentication.** There are no
 * accounts, so this pair is the only thing standing between a stranger and
 * somebody's name and address — which is why the backend refuses to say which
 * half was wrong, and why this screen repeats its answer verbatim instead of
 * guessing a friendlier one. «No order matches» is the whole truth a visitor
 * is entitled to.
 *
 * The reference is prefilled from `?ref=`, so the link on the confirmation
 * screen carries it and nobody has to copy a code between two pages. The phone
 * is never prefilled; a link that authenticated itself would defeat the pair.
 */

const schema = z.object({
  reference: z
    .string()
    .trim()
    .min(6, "کد رهگیری کوتاه‌تر از حد مجاز است")
    .max(20, "کد رهگیری بلندتر از حد مجاز است"),
  customer_phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => IRANIAN_MOBILE.test(v), "شماره‌ی موبایل معتبر نیست"),
});

type TrackValues = z.input<typeof schema>;

const TONE: Record<
  (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]["tone"],
  { surface: string; icon: React.ElementType }
> = {
  waiting: { surface: "bg-confirm-tint text-confirm-tint-ink", icon: Clock },
  confirmed: { surface: "bg-confirm-tint text-confirm-tint-ink", icon: Check },
  cancelled: { surface: "bg-destructive/10 text-destructive", icon: X },
};

function Result({ order }: { order: OrderOut }) {
  const reduced = useReducedMotion();
  const status = ORDER_STATUS[order.status];
  const tone = TONE[status.tone];
  const Icon = tone.icon;

  const total = order.items.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0,
  );

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-line bg-paper p-5 shadow-raised sm:p-7"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[12px] tracking-[0.1em] text-muted">کد رهگیری</p>
          <p className="ltr-isolate mt-1.5 font-figure text-xl tracking-[0.18em]">
            {order.reference}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm",
            tone.surface,
          )}
        >
          <Icon className="size-4" aria-hidden />
          {status.label}
        </span>
      </div>

      <p className="mt-5 border-t border-line pt-5 text-sm leading-loose text-ink-2">
        {status.detail}
      </p>

      <dl className="mt-5 flex gap-2 text-[13px] leading-loose">
        <dt className="shrink-0 text-muted">به نام</dt>
        <dd>{order.customer_name}</dd>
      </dl>

      <ul className="mt-5 divide-y divide-line border-t border-line">
        {order.items.map((item, index) => (
          <li key={index} className="flex items-baseline justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="line-clamp-1 text-sm">{item.carpet_name}</span>
              <span className="mt-1 block text-[12px] text-muted">
                {formatSize(item.width_cm, item.length_cm)} · {formatNumber(item.quantity)} عدد
              </span>
            </span>
            <span className="shrink-0 text-sm tabular-nums">
              {formatNumber(Number(item.unit_price) * item.quantity)}
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
    </motion.section>
  );
}

export function TrackOrder() {
  const params = useSearchParams();
  const [order, setOrder] = React.useState<OrderOut | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);

  const form = useForm<TrackValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      // Only the reference. Prefilling the phone as well would turn a shared
      // link into a key.
      reference: params.get("ref") ?? "",
      customer_phone: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    setOrder(null);
    const parsed = schema.parse(values);
    try {
      setOrder(await trackOrder(parsed));
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error.message
          : "پیگیری انجام نشد. لطفاً دوباره تلاش کنید.",
      );
    }
  });

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="rounded-xl border border-line bg-paper p-5 shadow-panel sm:p-7"
      >
        <p className="mb-6 text-sm leading-loose text-muted">
          کد رهگیری‌ای که هنگام ثبت سفارش گرفتید، به‌همراه شماره‌ی موبایلی که با آن
          سفارش داده‌اید.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="reference" className="block text-sm text-ink-2">
              کد رهگیری
            </label>
            <Input
              id="reference"
              dir="ltr"
              autoComplete="off"
              placeholder="FR-XXXXXXXX"
              className="font-figure tracking-[0.12em]"
              aria-invalid={Boolean(form.formState.errors.reference)}
              {...form.register("reference")}
            />
            {form.formState.errors.reference && (
              <p role="alert" className="text-[12.5px] leading-loose text-destructive">
                {form.formState.errors.reference.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="customer_phone" className="block text-sm text-ink-2">
              شماره‌ی موبایل
            </label>
            <Input
              id="customer_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              aria-invalid={Boolean(form.formState.errors.customer_phone)}
              {...form.register("customer_phone")}
            />
            {form.formState.errors.customer_phone && (
              <p role="alert" className="text-[12.5px] leading-loose text-destructive">
                {form.formState.errors.customer_phone.message}
              </p>
            )}
          </div>
        </div>

        {failure && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm leading-loose text-destructive"
          >
            {failure}
          </p>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-7 h-12 w-full gap-2 rounded-full sm:w-auto sm:px-8"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              در حال پیگیری…
            </>
          ) : (
            <>
              <PackageSearch className="size-4" />
              پیگیری سفارش
            </>
          )}
        </Button>
      </form>

      {order && <Result order={order} />}

      {/* No link yet. The contact page is §6-12 and is not built; pointing at
          some other page to have something clickable is worse than the plain
          sentence. */}
      <p className="text-center text-[12.5px] leading-loose text-muted">
        کد رهگیری را گم کرده‌اید؟ با شماره‌ای که سفارش داده‌اید با فروشگاه تماس بگیرید.
      </p>
    </div>
  );
}
