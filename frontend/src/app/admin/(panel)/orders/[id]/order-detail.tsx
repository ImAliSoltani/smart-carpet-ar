"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Loader2, Phone } from "lucide-react";

import { EASE_OUT, ENTER, GoldRule, staggerDelay } from "@/components/toranjan/admin-motion";
import { OrderStatusBadge } from "@/components/toranjan/order-status-badge";
import { adminKeys, ordersQuery, setOrderStatus } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminOrder, OrderStatus } from "@/lib/api/types";
import { formatDateTime, formatNumber, formatSize, formatToman } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * One order, and the only screen in the panel that changes something (§6-17).
 *
 * The list endpoint is the source. There is no `GET /admin/orders/{id}`, and
 * adding one to render a row we already hold would be a request to save a
 * lookup — the row is found in the cached list instead, which also means
 * arriving from the table costs no request at all.
 */

/**
 * All three states, minus whichever one the order is already in.
 *
 * «در انتظار» belongs here and was missing at first — §6-17 names three states,
 * not a one-way trip out of the first. Without it a mis-tap was permanent: an
 * order cancelled by accident could be confirmed, but never put back where it
 * was, and the shopkeeper would be looking at a record that no longer described
 * anything real.
 */
const FLOW: { to: OrderStatus; label: string; hint: string; tone: "primary" | "quiet" | "danger" }[] = [
  {
    to: "confirmed",
    label: "تأیید سفارش",
    hint: "یعنی با مشتری هماهنگ شده و آماده‌ی ارسال است.",
    tone: "primary",
  },
  {
    to: "pending",
    label: "بازگرداندن به انتظار",
    hint: "برای وقتی که وضعیت اشتباه ثبت شده و باید دوباره بررسی شود.",
    tone: "quiet",
  },
  {
    to: "cancelled",
    label: "لغو سفارش",
    hint: "برای مشتری قابل دیدن است، پس پیش از زدن با او تماس بگیرید.",
    tone: "danger",
  },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="panel-label sm:w-32 sm:shrink-0">{label}</span>
      <span className="text-[14px] leading-relaxed">{children}</span>
    </div>
  );
}

export function OrderDetail({ orderId }: { orderId: number }) {
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const [failure, setFailure] = React.useState<string | null>(null);
  const [justChanged, setJustChanged] = React.useState(false);

  const orders = useQuery(ordersQuery());
  const order = orders.data?.find((o) => o.id === orderId);

  const change = useMutation({
    mutationFn: (to: OrderStatus) => setOrderStatus(orderId, to),
    onMutate: () => setFailure(null),
    onSuccess: (updated) => {
      // Written straight into the cached list rather than invalidated: the
      // table, the dashboard and the rail's badge all read that one list, and
      // a refetch would blank them for as long as the round trip takes.
      queryClient.setQueryData<AdminOrder[]>(adminKeys.orders(undefined), (prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)),
      );
      // The counters are computed in the database, so they do have to be asked
      // again — but only after the row itself is already correct on screen.
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      setJustChanged(true);
      window.setTimeout(() => setJustChanged(false), 2200);
    },
    onError: (error) =>
      setFailure(error instanceof ApiError ? error.message : "تغییر وضعیت انجام نشد."),
  });

  if (orders.isPending) {
    return <div className="glass h-96 animate-pulse rounded-xl" aria-hidden />;
  }

  if (orders.error) {
    return <p className="glass rounded-xl p-6 text-sm leading-loose">{orders.error.message}</p>;
  }

  if (!order) {
    return (
      <div className="glass rounded-xl px-6 py-16 text-center">
        <p className="text-[15px]">این سفارش پیدا نشد.</p>
        <p className="mt-2 text-[13px] leading-loose text-muted">
          ممکن است حذف شده باشد، یا از دویست سفارش اخیر بیرون افتاده باشد.
        </p>
        <Link
          href="/admin/orders"
          className="mt-5 inline-flex h-11 items-center rounded-full px-5 text-[13.5px] text-accent"
        >
          بازگشت به سفارش‌ها
        </Link>
      </div>
    );
  }

  const detail = ORDER_STATUS[order.status];
  const available = FLOW.filter((step) => step.to !== order.status);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/orders"
        className="-ms-3 inline-flex h-11 w-fit items-center gap-1.5 px-3 text-[13.5px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
      >
        <ArrowRight className="size-4" strokeWidth={1.5} />
        سفارش‌ها
      </Link>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ENTER}
        className="glass relative overflow-hidden rounded-xl p-5 shadow-panel sm:p-6"
      >
        <GoldRule delay={0.15} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="panel-label">کد رهگیری</p>
            <p className="mt-1 font-figure text-[22px] font-semibold tracking-tight" dir="ltr">
              {order.reference}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            {/* The tick is drawn, not shown — the same four-beat gesture the
                storefront's confirmation uses, reduced to its first beat. */}
            {justChanged && (
              <motion.span
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }}
                className="grid size-6 place-items-center rounded-full bg-status-confirmed/15 text-status-confirmed"
                aria-hidden
              >
                <Check className="size-3.5" strokeWidth={2.5} />
              </motion.span>
            )}
          </div>
        </div>

        <p className="mt-3 text-[13.5px] leading-loose text-muted">{detail.detail}</p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ENTER, delay: reduced ? 0 : staggerDelay(1) }}
          className="glass rounded-xl p-5 shadow-panel sm:p-6"
        >
          <h2 className="mb-2 text-[16px] font-medium">اقلام سفارش</h2>
          <ul>
            {order.items.map((item, i) => (
              <li
                key={`${item.carpet_name}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[14px] leading-relaxed">{item.carpet_name}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {formatSize(item.width_cm, item.length_cm)}
                    {item.quantity > 1 && ` · ${formatNumber(item.quantity)} عدد`}
                  </p>
                </div>
                <p className="text-[14px]">{formatToman(item.unit_price)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-line-2 pt-4">
            <span className="text-[14px]">جمع کل</span>
            <span className="text-[18px] font-semibold">{formatToman(order.total)}</span>
          </div>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...ENTER, delay: reduced ? 0 : staggerDelay(2) }}
          className="flex flex-col gap-5"
        >
          <div className="glass rounded-xl p-5 shadow-panel sm:p-6">
            <h2 className="mb-1 text-[16px] font-medium">مشتری</h2>
            <Row label="نام">{order.customer_name}</Row>
            <Row label="تلفن">
              {/* A real `tel:` link. The panel is opened on a phone as often as
                  not, and the next thing after reading an order is calling. */}
              <a
                href={`tel:${order.customer_phone}`}
                className="inline-flex min-h-11 items-center gap-1.5 font-figure underline-offset-4 hover:underline"
                dir="ltr"
              >
                <Phone className="size-3.5 text-accent" strokeWidth={1.5} aria-hidden />
                {order.customer_phone}
              </a>
            </Row>
            <Row label="نشانی">{order.address}</Row>
            {order.note && <Row label="یادداشت">{order.note}</Row>}
            <Row label="ثبت">{formatDateTime(order.created_at)}</Row>
          </div>

          <div className="glass rounded-xl p-5 shadow-panel sm:p-6">
            <h2 className="text-[16px] font-medium">تغییر وضعیت</h2>

            <div className="mt-4 flex flex-col gap-3">
              {available.map((step) => (
                <div key={step.to}>
                  <button
                    type="button"
                    onClick={() => change.mutate(step.to)}
                    disabled={change.isPending}
                    className={cn(
                      "flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px]",
                      "transition-colors duration-[--dur-feedback] disabled:opacity-60",
                      step.tone === "primary" && "bg-cta text-on-cta hover:bg-cta-hover",
                      step.tone === "quiet" && "border border-line-2 text-ink-2 hover:text-ink",
                      step.tone === "danger" &&
                        "border border-status-cancelled/40 text-status-cancelled hover:bg-status-cancelled/10",
                    )}
                  >
                    {change.isPending && change.variables === step.to && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    {step.label}
                  </button>
                  <p className="mt-2 text-[13px] leading-loose text-muted">{step.hint}</p>
                </div>
              ))}
            </div>

            {failure && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3.5 text-[13px] leading-loose"
              >
                {failure}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
