"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ImageOff, Plus, Search } from "lucide-react";

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
import { adminCarpetsQuery } from "@/lib/api/admin";
import type { AdminCarpetRow } from "@/lib/api/types";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber, formatToman } from "@/lib/format";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The carpet management table (ROADMAP §6-15).
 *
 * Unlike the orders list this one pages on the server, because the catalogue is
 * the thing that grows: seventy today, and the endpoint that feeds it is the
 * one written so a deactivated carpet stays reachable.
 *
 * Search and the active filter are query parameters, so a view is shareable and
 * survives a refresh — and so «۳ فرش غیرفعال» on the dashboard can link here
 * with the filter already set.
 */

const PAGE_SIZE = 20;

type Visibility = "all" | "active" | "inactive";

const TABS: { value: Visibility; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
];

/** «۳ از ۴ آماده» — or nothing at all when the carpet has no sizes yet. */
function ArReadiness({ ready, total }: { ready: number; total: number }) {
  if (total === 0) return <span className="text-[13px] text-muted">—</span>;
  const done = ready === total;
  return (
    <span
      className={cn(
        "whitespace-nowrap text-[13px]",
        done ? "text-status-confirmed" : ready === 0 ? "text-muted" : "text-status-waiting",
      )}
    >
      {formatNumber(ready)} از {formatNumber(total)}
    </span>
  );
}

export function CarpetsView() {
  const router = useRouter();
  const params = useSearchParams();
  const reduced = useReducedMotion();

  const rawVisibility = params.get("visibility");
  const visibility: Visibility =
    rawVisibility === "active" || rawVisibility === "inactive" ? rawVisibility : "all";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const q = params.get("q") ?? "";

  // Typed into local state, pushed to the URL after a pause. Writing the URL on
  // every keystroke would put one history entry per letter and fire a request
  // per letter with it.
  const [draft, setDraft] = React.useState(q);

  // Adjusted during render rather than in an effect — React's own pattern for
  // «reset state when a prop changes». As an effect it renders once with the
  // stale value, then again with the fresh one, and the field visibly flickers
  // back on a browser Back press.
  const [lastQ, setLastQ] = React.useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setDraft(q);
  }

  const write = React.useCallback(
    (next: { q?: string; visibility?: Visibility; page?: number }) => {
      const search = new URLSearchParams(params.toString());
      if (next.q !== undefined) {
        if (next.q) search.set("q", next.q);
        else search.delete("q");
      }
      if (next.visibility !== undefined) {
        if (next.visibility === "all") search.delete("visibility");
        else search.set("visibility", next.visibility);
      }
      // Any change of filter returns to the first page: page 3 of a narrower
      // result is usually empty, and an empty page reads as «nothing matched».
      const nextPage = next.page ?? 1;
      if (nextPage > 1) search.set("page", String(nextPage));
      else search.delete("page");

      const qs = search.toString();
      router.replace(qs ? `/admin/carpets?${qs}` : "/admin/carpets", { scroll: false });
    },
    [params, router],
  );

  React.useEffect(() => {
    if (draft === q) return;
    const timer = window.setTimeout(() => write({ q: draft }), 300);
    return () => window.clearTimeout(timer);
  }, [draft, q, write]);

  const carpets = useQuery(
    adminCarpetsQuery({
      q: q || undefined,
      is_active: visibility === "all" ? undefined : visibility === "active",
      page,
      page_size: PAGE_SIZE,
    }),
  );

  const rows = carpets.data?.items ?? [];
  const total = carpets.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const current = visibility === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => write({ visibility: tab.value })}
                aria-pressed={current}
                className={cn(
                  "relative flex h-11 items-center rounded-full px-4 text-[13.5px]",
                  "transition-colors duration-[--dur-feedback]",
                  current ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {current && (
                  <motion.span
                    layoutId="carpets-tab"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full border border-line-2 bg-white/[0.06]"
                    transition={reduced ? { duration: 0 } : { duration: 0.36, ease: EASE_OUT }}
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative sm:w-64">
            <Search
              className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="sr-only">جست‌وجو در فرش‌ها</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="نام فرش"
              className="h-11 w-full rounded-full border border-line-2 bg-white/[0.04] pe-10 ps-4 text-base text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none"
            />
          </label>

          <Link
            href="/admin/carpets/new"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-cta px-5 text-[13.5px] text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
          >
            <Plus className="size-4" strokeWidth={2} />
            فرش تازه
          </Link>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-xl shadow-panel">
        {carpets.isPending ? (
          <div className="h-96 animate-pulse" aria-hidden />
        ) : carpets.error ? (
          <p className="px-5 py-14 text-center text-sm leading-loose">{carpets.error.message}</p>
        ) : rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-[15px]">
              {q || visibility !== "all" ? "فرشی با این شرط پیدا نشد" : "هنوز فرشی ثبت نشده است"}
            </p>
            {(q || visibility !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  write({ q: "", visibility: "all" });
                }}
                className="mt-4 h-11 rounded-full px-5 text-[13.5px] text-accent"
              >
                برداشتن صافی‌ها
              </button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[64px]">
                  <span className="sr-only">عکس</span>
                </TableHead>
                <TableHead>نام</TableHead>
                <TableHead className="hidden md:table-cell">طرح و جنس</TableHead>
                <TableHead className="hidden sm:table-cell">سایزها</TableHead>
                <TableHead className="hidden lg:table-cell">قیمت</TableHead>
                <TableHead className="hidden sm:table-cell">AR</TableHead>
                <TableHead className="text-end">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((carpet, i) => (
                <CarpetRow
                  key={carpet.id}
                  carpet={carpet}
                  index={i}
                  total={rows.length}
                  reduced={reduced}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-muted">
            صفحه‌ی {formatNumber(page)} از {formatNumber(pages)} · {formatNumber(total)} فرش
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => write({ q, visibility, page: page - 1 })}
              className="h-11 rounded-full border border-line-2 px-5 text-[13.5px] transition-colors duration-[--dur-feedback] hover:border-line disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => write({ q, visibility, page: page + 1 })}
              className="h-11 rounded-full border border-line-2 px-5 text-[13.5px] transition-colors duration-[--dur-feedback] hover:border-line disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function CarpetRow({
  carpet,
  index,
  total,
  reduced,
}: {
  carpet: AdminCarpetRow;
  index: number;
  total: number;
  reduced: boolean | null;
}) {
  const row = useRowLink(`/admin/carpets/${carpet.id}`);
  const cover = mediaUrl(carpet.primary_image);
  return (
<motion.tr
                    initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.46,
            ease: EASE_OUT,
            delay: reduced ? 0 : listStagger(index, total),
          }}
          onClick={row.onClick}
  className={cn(
    "border-b border-line transition-colors duration-[--dur-feedback] hover:bg-white/[0.04]",
    row.className,
  )}
        >
          <TableCell>
            <span className="relative block size-12 overflow-hidden rounded-md bg-white/[0.04]">
              {cover ? (
                <Image
                  src={cover}
                  alt=""
                  fill
                  sizes="48px"
                  // `contain`: these photographs are cut out to the
                  // weave, and cropping one cuts the border off the
                  // pattern — the same reason the shop's card does it.
                  className="object-contain p-1"
                />
              ) : (
                <ImageOff
                  className="absolute inset-0 m-auto size-4 text-muted"
                  strokeWidth={1.5}
                  aria-hidden
                />
              )}
            </span>
          </TableCell>

          <TableCell>
            <Link
              href={`/admin/carpets/${carpet.id}`}
              className="inline-flex min-h-11 items-center text-[14px] leading-relaxed underline-offset-4 hover:underline"
            >
              {carpet.name}
            </Link>
            <span className="block truncate text-[13px] text-ink-2 md:hidden">
              {PATTERN_LABEL[carpet.pattern]} · {MATERIAL_LABEL[carpet.material]}
            </span>
          </TableCell>

          <TableCell className="hidden text-[13.5px] text-ink-2 md:table-cell">
            {PATTERN_LABEL[carpet.pattern]} · {MATERIAL_LABEL[carpet.material]}
          </TableCell>

          <TableCell className="hidden text-[13.5px] sm:table-cell">
            {formatNumber(carpet.variants_count)}
          </TableCell>

          <TableCell className="hidden whitespace-nowrap text-[13.5px] lg:table-cell">
            {carpet.min_price ? formatToman(carpet.min_price) : "—"}
          </TableCell>

          <TableCell className="hidden sm:table-cell">
            <ArReadiness ready={carpet.ar_ready} total={carpet.variants_count} />
          </TableCell>

          <TableCell className="text-end">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px]",
                // Red, not grey. «Not on sale» is a state the shopkeeper needs
                // to spot while scanning, and grey is what every quiet thing on
                // this page already looks like.
                carpet.is_active
                  ? "border-status-confirmed/35 bg-status-confirmed/12 text-status-confirmed"
                  : "border-status-cancelled/40 bg-status-cancelled/12 text-status-cancelled",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  carpet.is_active
                    ? "bg-status-confirmed"
                    : "border border-status-cancelled bg-transparent",
                )}
              />
              {carpet.is_active ? "فعال" : "غیرفعال"}
            </span>
          </TableCell>
        </motion.tr>
  );
}
