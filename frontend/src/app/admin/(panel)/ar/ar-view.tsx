"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ImageOff, Search } from "lucide-react";

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
import { arQueueQuery, needsArAttention } from "@/lib/api/admin";
import type { AdminCarpetRow } from "@/lib/api/types";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The AR review queue (ROADMAP §6-16).
 *
 * The dashboard has linked here since it was written — its «واقعیت افزوده»
 * counter and its failure notice both point at this route — so this page is
 * what stops three existing links being a 404.
 *
 * **What a row can and cannot say.** `AdminCarpetRow` carries one AR figure,
 * `ar_ready`, so this list can tell that a carpet has sizes without files but
 * not *why*: a size that was never built and a size whose build failed look
 * identical from here. Distinguishing them costs a request per carpet, which is
 * the review page's job — it asks for exactly one carpet. So the queue answers
 * «which carpets need you», and the page it opens answers «what happened».
 *
 * Filtering happens in the client for the same reason (see `arQueueQuery`);
 * the walk that feeds it is what keeps the count above the table honest.
 */

const PAGE_SIZE = 20;

type Scope = "pending" | "all";

export function ArQueueView() {
  const router = useRouter();
  const params = useSearchParams();
  const reduced = useReducedMotion();

  const scope: Scope = params.get("scope") === "all" ? "all" : "pending";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const q = params.get("q") ?? "";

  const [draft, setDraft] = React.useState(q);

  // Adjusted during render, the same as the carpets table: as an effect the
  // field renders once with the stale value and visibly flickers back on Back.
  const [lastQ, setLastQ] = React.useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setDraft(q);
  }

  const write = React.useCallback(
    (next: { q?: string; scope?: Scope; page?: number }) => {
      const search = new URLSearchParams(params.toString());
      if (next.q !== undefined) {
        if (next.q) search.set("q", next.q);
        else search.delete("q");
      }
      if (next.scope !== undefined) {
        if (next.scope === "pending") search.delete("scope");
        else search.set("scope", next.scope);
      }
      const nextPage = next.page ?? 1;
      if (nextPage > 1) search.set("page", String(nextPage));
      else search.delete("page");

      const qs = search.toString();
      router.replace(qs ? `/admin/ar?${qs}` : "/admin/ar", { scroll: false });
    },
    [params, router],
  );

  React.useEffect(() => {
    if (draft === q) return;
    const timer = window.setTimeout(() => write({ q: draft }), 300);
    return () => window.clearTimeout(timer);
  }, [draft, q, write]);

  const carpets = useQuery(arQueueQuery());

  const all = React.useMemo(() => carpets.data ?? [], [carpets.data]);
  const pendingCount = React.useMemo(() => all.filter(needsArAttention).length, [all]);

  const rows = React.useMemo(() => {
    const needle = q.trim();
    const matched = all.filter((carpet) => {
      if (scope === "pending" && !needsArAttention(carpet)) return false;
      if (needle && !carpet.name.includes(needle)) return false;
      return true;
    });
    // Most outstanding first, so the worst carpet is the one you land on. Ties
    // fall back to id descending, which is the order the catalogue itself uses.
    return matched.sort((a, b) => {
      const left = a.variants_count - a.ar_ready;
      const right = b.variants_count - b.ar_ready;
      return right - left || b.id - a.id;
    });
  }, [all, q, scope]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const TABS: { value: Scope; label: string; count: number }[] = [
    { value: "pending", label: "رسیدگی می‌خواهد", count: pendingCount },
    { value: "all", label: "همه", count: all.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const current = scope === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => write({ scope: tab.value })}
                aria-pressed={current}
                className={cn(
                  "relative flex h-11 items-center gap-2 rounded-full px-4 text-[13.5px]",
                  "transition-colors duration-[--dur-feedback]",
                  current ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {current && (
                  <motion.span
                    layoutId="ar-tab"
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full border border-line-2 bg-white/[0.06]"
                    transition={reduced ? { duration: 0 } : { duration: 0.36, ease: EASE_OUT }}
                  />
                )}
                {tab.label}
                {!carpets.isPending && (
                  <span className="text-[12.5px] text-muted">{formatNumber(tab.count)}</span>
                )}
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
          <span className="sr-only">جست‌وجو در فرش‌ها</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="نام فرش"
            className="h-11 w-full rounded-full border border-line-2 bg-white/[0.04] pe-10 ps-4 text-base text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none"
          />
        </label>
      </div>

      <div className="glass rounded-xl shadow-panel">
        {carpets.isPending ? (
          <div className="h-96 animate-pulse" aria-hidden />
        ) : carpets.error ? (
          <p className="px-5 py-14 text-center text-sm leading-loose">{carpets.error.message}</p>
        ) : shown.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-[15px]">
              {q
                ? "فرشی با این نام پیدا نشد"
                : scope === "pending"
                  ? "همه‌ی فرش‌ها فایل واقعیت افزوده دارند"
                  : "هنوز فرشی ثبت نشده است"}
            </p>
            {(q || scope !== "pending") && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  write({ q: "", scope: "pending" });
                }}
                className="mt-4 h-11 rounded-full px-5 text-[13.5px] text-accent"
              >
                برداشتن صافی‌ها
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px]">
                    <span className="sr-only">عکس</span>
                  </TableHead>
                  <TableHead>نام</TableHead>
                  <TableHead className="hidden md:table-cell">طرح و جنس</TableHead>
                  <TableHead className="hidden sm:table-cell">سایزها</TableHead>
                  <TableHead className="text-end">فایل‌های AR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((carpet, i) => (
                  <ArRow
                    key={carpet.id}
                    carpet={carpet}
                    index={i}
                    total={shown.length}
                    reduced={reduced}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-muted">
            صفحه‌ی {formatNumber(page)} از {formatNumber(pages)} · {formatNumber(rows.length)} فرش
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => write({ q, scope, page: page - 1 })}
              className="h-11 rounded-full border border-line-2 px-5 text-[13.5px] transition-colors duration-[--dur-feedback] hover:border-line disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => write({ q, scope, page: page + 1 })}
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

function ArRow({
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
  const row = useRowLink(`/admin/ar/${carpet.id}`);
  const cover = mediaUrl(carpet.primary_image);
  const outstanding = carpet.variants_count - carpet.ar_ready;

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
            <Image src={cover} alt="" fill sizes="48px" className="object-contain p-1" />
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
          href={`/admin/ar/${carpet.id}`}
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

      <TableCell className="text-end">
        {carpet.variants_count === 0 ? (
          // Not «۰ از ۰». A carpet with no sizes has nothing to build, and the
          // API refuses it outright — so it is told apart from one that is
          // merely behind.
          <span className="whitespace-nowrap text-[13px] text-muted">بدون سایز</span>
        ) : (
          <span
            className={cn(
              "whitespace-nowrap text-[13px]",
              outstanding === 0
                ? "text-status-confirmed"
                : carpet.ar_ready === 0
                  ? "text-muted"
                  : "text-status-waiting",
            )}
          >
            {formatNumber(carpet.ar_ready)} از {formatNumber(carpet.variants_count)}
          </span>
        )}
      </TableCell>
    </motion.tr>
  );
}
