"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Cuboid } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ordersQuery, statsQuery } from "@/lib/api/admin";
import { OrderStatusBadge } from "@/components/toranjan/order-status-badge";
import { formatDate, formatNumber, formatToman } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The dashboard (ROADMAP §6-14): counters, and the orders that just came in.
 *
 * Every figure here is counted by the database. The obvious shortcut — ask for
 * the orders list and read its length — is wrong in a way that only shows up
 * once the shop is busy, because that endpoint caps its response.
 */

function Counter({
  label,
  value,
  hint,
  href,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "plain" | "attention";
}) {
  const body = (
    <>
      <p className="text-[11px] tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-[26px] font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1.5 text-[12.5px] leading-loose text-muted">{hint}</p>}
    </>
  );

  const className = cn(
    "rounded-xl border bg-paper p-5 shadow-panel",
    tone === "attention" ? "border-confirm-tint-ink/30" : "border-line",
    href && "transition-colors duration-[--dur-feedback] hover:border-line-2",
  );

  return href ? (
    <Link href={href} className={cn(className, "block")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function DashboardView() {
  const stats = useQuery(statsQuery());
  const orders = useQuery(ordersQuery());

  if (stats.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-line bg-paper" />
        ))}
      </div>
    );
  }

  if (stats.error) {
    return (
      <p className="rounded-md border border-line bg-paper p-6 text-sm leading-loose">
        {stats.error.message}
      </p>
    );
  }

  const s = stats.data;
  const recent = (orders.data ?? []).slice(0, 8);
  const arTrouble = s.ar_failed + s.ar_missing;

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Counter
          label="در انتظار تأیید"
          value={formatNumber(s.orders_pending)}
          hint={s.orders_pending > 0 ? "منتظر شماست" : "چیزی معطل نمانده"}
          href="/admin/orders?status=pending"
          tone={s.orders_pending > 0 ? "attention" : "plain"}
        />
        <Counter
          label="فروش تأییدشده"
          value={formatToman(s.confirmed_total)}
          hint={`از ${formatNumber(s.orders_confirmed)} سفارش تأییدشده`}
        />
        <Counter
          label="فرش‌های فعال"
          value={formatNumber(s.carpets_active)}
          hint={
            s.carpets_inactive > 0
              ? `${formatNumber(s.carpets_inactive)} فرش غیرفعال`
              : `${formatNumber(s.variants_total)} سایز فروشی`
          }
          href="/admin/carpets"
        />
        <Counter
          label="واقعیت افزوده"
          value={`${formatNumber(s.ar_ready)} از ${formatNumber(s.variants_total)}`}
          hint="سایزهایی که فایل AR دارند"
          href="/admin/ar"
          tone={arTrouble > 0 ? "attention" : "plain"}
        />
      </section>

      {/* Only when something is actually wrong. A permanent «all good» panel is
          furniture; a panel that appears is a message. */}
      {(s.ar_failed > 0 || s.ar_processing > 0) && (
        <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-line bg-paper px-5 py-4 shadow-panel">
          {s.ar_failed > 0 && (
            <p className="flex items-center gap-2 text-[13px]">
              <AlertTriangle className="size-4 text-destructive" strokeWidth={1.5} />
              ساخت فایل AR برای {formatNumber(s.ar_failed)} سایز شکست خورده است.
              <Link href="/admin/ar" className="text-accent underline underline-offset-4">
                بازبینی
              </Link>
            </p>
          )}
          {s.ar_processing > 0 && (
            <p className="flex items-center gap-2 text-[13px] text-muted">
              <Cuboid className="size-4" strokeWidth={1.5} />
              {formatNumber(s.ar_processing)} سایز در حال ساخته شدن است.
            </p>
          )}
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-medium">سفارش‌های اخیر</h2>
          <Link
            href="/admin/orders"
            // `h-11` and a negative inline margin: the §3-5 floor applies to
            // anything touched, and a 20px line of text is not a target. The
            // padding is pulled back out so the words still line up with the
            // heading beside them.
            className="-me-3 flex h-11 items-center gap-1.5 px-3 text-[13px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
          >
            همه‌ی سفارش‌ها
            <ArrowLeft className="size-4" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-paper shadow-panel">
          {orders.isPending ? (
            <div className="h-56 animate-pulse rounded-xl bg-paper" aria-hidden />
          ) : recent.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm leading-loose text-muted">
              هنوز سفارشی ثبت نشده است.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کد رهگیری</TableHead>
                  <TableHead className="hidden sm:table-cell">مشتری</TableHead>
                  <TableHead className="hidden sm:table-cell">تاریخ</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-end">مبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        // Latin figures: a tracking code is typed and read back
                        // character by character, and Persian digits in a code
                        // somebody has to compare against an SMS is a trap.
                        //
                        // `min-h-11` because the cell's own padding leaves the
                        // link 37px tall, and a row you tap to open an order is
                        // exactly what the §3-5 floor is about.
                        className="inline-flex min-h-11 items-center font-figure text-[13px] underline-offset-4 hover:underline"
                        dir="ltr"
                      >
                        {order.reference}
                      </Link>
                      {/* On a phone the customer moves under the reference
                          instead of losing its column. Four columns at 375
                          overflowed by 15px — «در انتظار تأیید» alone takes
                          122 of them — and dropping the name outright would
                          have made this a list of codes. Height is the axis a
                          phone has; it is the same answer the compare table
                          arrived at. */}
                      <span className="block truncate text-[12px] text-muted sm:hidden">
                        {order.customer_name}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-[13px] sm:table-cell">
                      {order.customer_name}
                    </TableCell>
                    <TableCell className="hidden text-[13px] text-muted sm:table-cell">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-end text-[13px]">
                      {formatToman(order.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
