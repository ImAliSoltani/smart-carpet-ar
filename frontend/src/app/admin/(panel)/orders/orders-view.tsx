"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Inbox, Search } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EASE_OUT, listStagger } from "@/components/toranjan/admin-motion";
import { useRowLink } from "@/components/toranjan/row-link";
import { OrderStatusBadge } from "@/components/toranjan/order-status-badge";
import { ordersQuery } from "@/lib/api/admin";
import type { AdminOrder, OrderStatus } from "@/lib/api/types";
import { formatDate, formatNumber, formatToman } from "@/lib/format";
import { ORDER_STATUS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The orders table (ROADMAP §6-17).
 *
 * **The filter is a query parameter, not a `useState`.** The rule the shop
 * settled on holds here for the same reasons and one more: the dashboard's
 * «در انتظار تأیید» counter links straight to `?status=pending`, so the filter
 * has to be something a link can set. It also means a filtered view survives a
 * refresh and can be sent to somebody.
 *
 * Searching is done here rather than asked of the server. The endpoint caps at
 * 200 rows and has no text search, and a shop of this size fits inside that cap
 * — filtering an array the browser already holds is instant and costs nothing.
 * The moment that cap is a lie, this needs to become a real query.
 */

const TABS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "pending", label: ORDER_STATUS.pending.label },
  { value: "confirmed", label: ORDER_STATUS.confirmed.label },
  { value: "cancelled", label: ORDER_STATUS.cancelled.label },
];

function isStatus(value: string | null): value is OrderStatus {
  return value === "pending" || value === "confirmed" || value === "cancelled";
}

/** Persian digits in a reference are a trap; match on latin either way typed. */
function matches(order: AdminOrder, needle: string): boolean {
  if (!needle) return true;
  const hay = `${order.reference} ${order.customer_name} ${order.customer_phone}`.toLowerCase();
  return hay.includes(needle.toLowerCase());
}

export function OrdersView() {
  const router = useRouter();
  const params = useSearchParams();
  const reduced = useReducedMotion();

  const status = isStatus(params.get("status")) ? (params.get("status") as OrderStatus) : undefined;
  const [needle, setNeedle] = React.useState("");

  // One request for everything, filtered by status in the browser. Asking the
  // server per tab would refetch the same rows four times over.
  const orders = useQuery(ordersQuery());

  const setStatus = (next: OrderStatus | "all") => {
    const search = new URLSearchParams(params.toString());
    if (next === "all") search.delete("status");
    else search.set("status", next);
    const qs = search.toString();
    router.replace(qs ? `/admin/orders?${qs}` : "/admin/orders", { scroll: false });
  };

  // `?? []` inside the memo, not outside it. Written outside, the fallback is
  // a fresh array on every render where the query has no data, so the memo it
  // depends on never holds.
  const all = orders.data;
  const counts = React.useMemo(() => {
    const list = all ?? [];
    return {
      all: list.length,
      pending: list.filter((o) => o.status === "pending").length,
      confirmed: list.filter((o) => o.status === "confirmed").length,
      cancelled: list.filter((o) => o.status === "cancelled").length,
    };
  }, [all]);

  const list = all ?? [];
  const rows = list.filter((o) => (!status || o.status === status) && matches(o, needle));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs, not a select: four options that each answer «how many», and a
            count is the reason to press one. */}
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const current = tab.value === "all" ? !status : status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                aria-pressed={current}
                className={cn(
                  "relative flex h-11 items-center gap-2 rounded-full px-4 text-[13.5px]",
                  "transition-colors duration-[--dur-feedback]",
                  current ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {current && (
                  <motion.span
                    layoutId="orders-tab"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full border border-line-2 bg-white/[0.06]"
                    transition={reduced ? { duration: 0 } : { duration: 0.36, ease: EASE_OUT }}
                  />
                )}
                {tab.label}
                <span className="text-[12px] text-muted">
                  {formatNumber(counts[tab.value])}
                </span>
              </button>
            );
          })}
        </div>

        <label className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted"
            strokeWidth={1.5}
            aria-hidden
          />
          <span className="sr-only">جست‌وجو در سفارش‌ها</span>
          <input
            value={needle}
            onChange={(e) => setNeedle(e.target.value)}
            placeholder="کد رهگیری، نام یا تلفن"
            // 16px, or Safari zooms the page on focus and does not zoom back —
            // the trap `ui/input.tsx` already records.
            className="h-11 w-full rounded-full border border-line-2 bg-white/[0.04] pe-10 ps-4 text-base text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none"
          />
        </label>
      </div>

      <div className="glass overflow-hidden rounded-xl shadow-panel">
        {orders.isPending ? (
          <div className="h-72 animate-pulse" aria-hidden />
        ) : orders.error ? (
          <p className="px-5 py-14 text-center text-sm leading-loose">{orders.error.message}</p>
        ) : rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Inbox className="mx-auto size-8 text-muted" strokeWidth={1.5} aria-hidden />
            <p className="mt-4 text-[15px]">
              {needle || status ? "سفارشی با این شرط پیدا نشد" : "هنوز سفارشی ثبت نشده است"}
            </p>
            {(needle || status) && (
              <button
                type="button"
                onClick={() => {
                  setNeedle("");
                  setStatus("all");
                }}
                className="mt-4 h-11 rounded-full px-5 text-[13.5px] text-accent transition-colors duration-[--dur-feedback] hover:text-accent-strong"
              >
                برداشتن صافی‌ها
              </button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد رهگیری</TableHead>
                <TableHead className="hidden sm:table-cell">مشتری</TableHead>
                <TableHead className="hidden md:table-cell">تلفن</TableHead>
                <TableHead className="hidden lg:table-cell">تاریخ</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-end">مبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order, i) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  index={i}
                  total={rows.length}
                  reduced={reduced}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {rows.length > 0 && (
        <p className="text-[13px] text-muted">
          {formatNumber(rows.length)} سفارش
          {rows.length !== list.length && ` از ${formatNumber(list.length)}`}
        </p>
      )}
    </div>
  );
}

function OrderRow({
  order,
  index,
  total,
  reduced,
}: {
  order: AdminOrder;
  index: number;
  total: number;
  reduced: boolean | null;
}) {
  const row = useRowLink(`/admin/orders/${order.id}`);
  return (
          <motion.tr
            onClick={row.onClick}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.46,
              ease: EASE_OUT,
              delay: reduced ? 0 : listStagger(index, total),
            }}
            className={cn(
              "border-b border-line transition-colors duration-[--dur-feedback] hover:bg-white/[0.04]",
              row.className,
            )}
          >
            <TableCell>
              <Link
                href={`/admin/orders/${order.id}`}
                // Latin figures, and latin direction. A tracking code is
                // compared character by character against an SMS.
                className="inline-flex min-h-11 items-center font-figure text-[14px] underline-offset-4 hover:underline"
                dir="ltr"
              >
                {order.reference}
              </Link>
              <span className="block truncate text-[13px] text-ink-2 sm:hidden">
                {order.customer_name}
              </span>
            </TableCell>
            <TableCell className="hidden text-[14px] sm:table-cell">
              {order.customer_name}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <a
                href={`tel:${order.customer_phone}`}
                // `min-h-11`: this dials a phone, and a 17px line of
                // digits is not something a thumb can hit.
                className="inline-flex min-h-11 items-center font-figure text-[13.5px] text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                dir="ltr"
              >
                {order.customer_phone}
              </a>
            </TableCell>
            <TableCell className="hidden text-[13.5px] text-ink-2 lg:table-cell">
              {formatDate(order.created_at)}
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-end text-[14px]">
              {formatToman(order.total)}
            </TableCell>
          </motion.tr>
  );
}
