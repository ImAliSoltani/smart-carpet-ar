"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

import { carpetListQuery } from "@/lib/api/catalog";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber, formatToman } from "@/lib/format";

/**
 * Proof that the API client reaches the real catalogue.
 *
 * Part of the design check, not of the shop: it exists so the transport, the
 * generated types, the query layer, the file URLs and the Persian figures are
 * exercised against the running backend before a single page is built on them.
 * The product grid replaces it.
 *
 * It does show the three states every page owes the visitor (loading, failure,
 * nothing found), because those are the states this layer produces and the
 * pattern is the same everywhere.
 */
export function CatalogProbe() {
  const { data, error, isPending, isPaused, isFetching, refetch } = useQuery(
    carpetListQuery({ page_size: 6, sort: "price_desc" }),
  );

  // A held request is not a slow one, and a skeleton would say the wrong thing
  // about it: the query layer parks a retry while the browser reports itself
  // offline or the tab is in the background, and it stays parked — with no
  // error and no data — until that changes. Without its own branch the page
  // loads forever and never explains why.
  if (isPaused) {
    return (
      <p className="rounded-lg border border-line bg-paper p-6 text-sm leading-loose">
        ارتباط با سرور در دسترس نیست. به‌محض برقراری اتصال، خودش ادامه می‌دهد.
      </p>
    );
  }

  if (isPending) {
    return (
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="animate-pulse">
            <span className="block aspect-4/3 rounded-lg bg-line" />
            <span className="mt-3 block h-3 w-3/4 rounded bg-line" />
            <span className="mt-2 block h-3 w-1/2 rounded bg-line" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-line bg-paper p-6">
        <p className="text-sm leading-loose">{error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-4 rounded-full bg-cta px-5 py-2 text-sm text-on-cta transition-colors hover:bg-cta-hover disabled:opacity-60"
        >
          {isFetching ? "در حال تلاش…" : "دوباره امتحان کن"}
        </button>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-paper p-6 text-sm text-muted">
        هنوز فرشی در کاتالوگ نیست.
      </p>
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted">
        {formatNumber(data.total)} فرش در کاتالوگ؛ گران‌ترین‌ها:
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {data.items.map((carpet) => {
          const image = mediaUrl(carpet.primary_image);
          return (
            <li key={carpet.id}>
              <span className="relative block aspect-4/3 overflow-hidden rounded-lg border border-line bg-paper">
                {image && (
                  <Image
                    src={image}
                    alt={carpet.name}
                    fill
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className="object-contain"
                  />
                )}
              </span>
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed">{carpet.name}</p>
              <p className="mt-1 text-sm text-muted">{formatToman(carpet.min_price)}</p>
              <p className="mt-1 text-xs text-accent">
                {formatNumber(carpet.sizes_count)} اندازه
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
