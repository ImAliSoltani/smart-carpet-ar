"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { CarpetCard } from "@/components/toranjan/carpet-card";
import { carpetListQuery } from "@/lib/api/catalog";
import { useFavorites } from "@/lib/store/favorites";
import type { CarpetSort } from "@/lib/api/types";

/**
 * A short row of carpets on the home page.
 *
 * Deliberately the same `CarpetCard` the catalogue uses rather than a
 * home-page variant of it. A card that looks different here would be a second
 * thing to keep in step with the first — and the grid is where a visitor has
 * already learned to read a price, a size count and a heart.
 *
 * Four, not eight: this is a sample that ends in a link, not a second
 * catalogue. The page has somewhere to send people.
 */
export function HomeFeatured({
  title,
  note,
  sort,
  href = "/carpets",
}: {
  title: string;
  note?: string;
  sort: CarpetSort;
  href?: string;
}) {
  const favorites = useFavorites();
  const { data, isPending, error } = useQuery(carpetListQuery({ sort, page_size: 4 }));

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
      <div className="mb-8 flex items-end justify-between gap-4 border-t border-line pt-8">
        <div>
          <h2 className="text-xl font-light tracking-tight sm:text-2xl">{title}</h2>
          {note && <p className="mt-2 text-[13px] text-muted">{note}</p>}
        </div>
        <Link
          href={href}
          // `-me-3` with the padding back on: the link is a 44px target
          // (§3-5) without its text drifting away from the section's edge.
          className="group -me-3 flex h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm text-ink-2 transition-colors duration-[--dur-feedback] hover:text-ink"
        >
          دیدن همه
          <ChevronLeft className="size-4 transition-transform duration-[350ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-x-1" />
        </Link>
      </div>

      {/* No error banner here. A row that cannot load on the home page is not
          worth a red box across the front of the shop — the section simply is
          not there, and the catalogue link above it still works. */}
      {error ? null : isPending ? (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="animate-pulse">
              <span className="block aspect-3/4 rounded-md bg-line" />
              <span className="mt-4 block h-3 w-1/3 rounded bg-line" />
              <span className="mt-3 block h-3 w-4/5 rounded bg-line" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
          {data.items.map((carpet, i) => (
            <li key={carpet.id}>
              <CarpetCard
                carpet={carpet}
                index={i}
                isWishlisted={favorites.has(carpet.id)}
                onWishlistToggle={favorites.toggle}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
