"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { CarpetCard } from "@/components/toranjan/carpet-card";
import { carpetListQuery } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import type { CarpetFilters } from "@/lib/api/types";

/**
 * The catalogue grid.
 *
 * Filters arrive from the URL rather than from local state, so the links the
 * header already points at — `/carpets?pattern=lachak_toranj` — are the same
 * thing the filter panel will write later, and a filtered view stays
 * shareable and survives a reload.
 */
export function CarpetGrid({ filters }: { filters: CarpetFilters }) {
  const { data, error, isPending, isPaused, isFetching, refetch } = useQuery(
    carpetListQuery(filters),
  );

  if (isPaused) {
    return (
      <p className="rounded-md border border-line bg-paper p-6 text-sm leading-loose">
        ارتباط با سرور در دسترس نیست. به‌محض برقراری اتصال، خودش ادامه می‌دهد.
      </p>
    );
  }

  if (isPending) {
    return (
      <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="animate-pulse">
            <span className="block aspect-3/4 rounded-md bg-line" />
            <span className="mt-4 block h-3 w-1/3 rounded bg-line" />
            <span className="mt-3 block h-3 w-4/5 rounded bg-line" />
            <span className="mt-2 block h-3 w-1/2 rounded bg-line" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-line bg-paper p-6">
        <p className="text-sm leading-loose">{error.message}</p>
        {error instanceof ApiError && error.status === 422 && (
          <p className="mt-2 text-sm text-muted">
            احتمالاً یکی از فیلترهای آدرس معتبر نیست.
          </p>
        )}
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-4 rounded-full bg-cta px-5 py-2 text-sm text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover disabled:opacity-60"
        >
          {isFetching ? "در حال تلاش…" : "دوباره امتحان کن"}
        </button>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-md border border-line bg-paper p-10 text-center">
        <p className="text-lg">فرشی با این مشخصات پیدا نشد.</p>
        <p className="mt-3 text-sm leading-loose text-muted">
          می‌توانی یکی از فیلترها را بردارید یا همه‌ی فرش‌ها را ببینید.
        </p>
        <Link
          href="/carpets"
          className="mt-6 inline-block rounded-full bg-cta px-6 py-2.5 text-sm text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
        >
          همه‌ی فرش‌ها
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-7 text-sm text-muted">{formatNumber(data.total)} فرش</p>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
        {data.items.map((carpet, i) => (
          <li key={carpet.id}>
            <CarpetCard carpet={carpet} index={i} />
          </li>
        ))}
      </ul>
    </>
  );
}
