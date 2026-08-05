"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

import { CarpetCard } from "@/components/toranjan/carpet-card";
import { Button } from "@/components/ui/button";
import { carpetListQuery } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { useFavorites } from "@/lib/store/favorites";

/**
 * Favourites.
 *
 * The device remembers ids; the catalogue is asked for the rest. That is why
 * the store keeps no snapshot — a carpet that changed price, or lost its last
 * size, says so here rather than showing what it cost the day it was hearted.
 *
 * The listing endpoint gained a repeatable `id` filter for exactly this: it
 * was the only list the shop can hold that no combination of the existing
 * filters could describe.
 */
export function FavouritesGrid() {
  const favorites = useFavorites();

  const { data, error, isPending, isPaused } = useQuery({
    ...carpetListQuery({ id: favorites.ids, page_size: 60 }),
    // No ids, no request: an empty `id` list would read as «no id filter» and
    // fetch the whole catalogue back as somebody's favourites.
    enabled: favorites.hydrated && favorites.ids.length > 0,
  });

  if (!favorites.hydrated) {
    return <div className="h-64 animate-pulse rounded-xl border border-line bg-paper" aria-hidden />;
  }

  if (favorites.ids.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-paper px-6 py-16 text-center shadow-panel">
        <Heart className="mx-auto size-8 text-muted" aria-hidden />
        <p className="mt-5 text-lg font-light">هنوز فرشی را نشان نکرده‌اید</p>
        <p className="mt-2 text-sm leading-loose text-muted">
          روی قلب گوشه‌ی هر فرش بزنید تا همین‌جا کنار هم بماند.
        </p>
        <Button asChild className="mt-7 h-12 rounded-full px-7">
          <Link href="/carpets">دیدن فرش‌ها</Link>
        </Button>
      </div>
    );
  }

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
        {favorites.ids.map((id) => (
          <li key={id} className="animate-pulse">
            <span className="block aspect-3/4 rounded-md bg-line" />
            <span className="mt-4 block h-3 w-1/3 rounded bg-line" />
            <span className="mt-3 block h-3 w-4/5 rounded bg-line" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-line bg-paper p-6 text-sm leading-loose">
        {error instanceof ApiError ? error.message : "فهرست علاقه‌مندی‌ها بارگذاری نشد."}
      </p>
    );
  }

  // Kept in the order they were hearted, newest first — the listing endpoint
  // sorts by its own rule and has no idea what that order was.
  const byId = new Map(data.items.map((carpet) => [carpet.id, carpet]));
  const ordered = favorites.ids.map((id) => byId.get(id)).filter((c) => c !== undefined);

  return (
    <>
      <p className="mb-7 text-sm text-muted">{formatNumber(ordered.length)} فرش</p>
      {/* An id that no longer comes back is a carpet the shop retired. It is
          dropped from the view rather than shown as a gap; the heart stays in
          storage until the reader unhearts it, which costs nothing. */}
      <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
        {ordered.map((carpet, i) => (
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
    </>
  );
}
