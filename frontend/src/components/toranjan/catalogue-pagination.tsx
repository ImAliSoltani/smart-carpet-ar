"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatNumber } from "@/lib/format";

/**
 * The catalogue's page control.
 *
 * **Every page is a URL**, which is the rule the filters already follow: a
 * page is shareable, survives a reload, and the browser's back button walks
 * back through it. That is also why these are `next/link`s rather than buttons
 * calling `router.push` — a link can be opened in a new tab, and it prefetches.
 *
 * Following from that, `page=1` is never written. The first page is the bare
 * `/carpets`, so one view has one address instead of two.
 *
 * A link also scrolls to the top on navigation, which the filter panel
 * deliberately suppresses and this deliberately keeps: changing a filter
 * rewrites the grid you are looking at, while changing the page replaces it
 * with different carpets, and landing halfway down those is disorienting.
 */

/** first, last, and a window around the current page; `null` is a gap. */
export function pageWindow(current: number, last: number): (number | null)[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const pages = new Set<number>([1, last, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < last) pages.add(current + 1);
  // Keep the row from changing width as the window moves off either end.
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= last - 2) [last - 3, last - 2, last - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push(null);
    out.push(page);
  });
  return out;
}

export function CataloguePagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), lastPage);

  const hrefFor = React.useCallback(
    (target: number) => {
      const next = new URLSearchParams(params.toString());
      if (target <= 1) next.delete("page");
      else next.set("page", String(target));
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname],
  );

  // One page is not a choice, and a control that only ever says «۱» is noise.
  if (lastPage <= 1) return null;

  const window = pageWindow(current, lastPage);
  const first = (current - 1) * pageSize + 1;
  const shown = Math.min(current * pageSize, total);

  return (
    <div className="mt-12 flex flex-col items-center gap-4 border-t border-line pt-8 sm:flex-row sm:justify-between">
      <p className="text-[13px] text-muted">
        {formatNumber(first)} تا {formatNumber(shown)} از {formatNumber(total)} فرش
      </p>

      <Pagination className="w-auto">
        <PaginationContent>
          {/* No `href` disables an end rather than removing it: a row that
              loses a control at its edge shifts every page number sideways as
              the visitor walks through it. */}
          <PaginationItem>
            <PaginationPrevious href={current === 1 ? undefined : hrefFor(current - 1)} />
          </PaginationItem>

          {window.map((target, index) =>
            target === null ? (
              <PaginationItem key={`gap-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={target}>
                <PaginationLink
                  href={hrefFor(target)}
                  isActive={target === current}
                  aria-label={`صفحه‌ی ${formatNumber(target)}`}
                >
                  {formatNumber(target)}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext href={current === lastPage ? undefined : hrefFor(current + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
