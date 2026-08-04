"use client";

import { useQuery } from "@tanstack/react-query";

import { CarpetCard } from "@/components/toranjan/carpet-card";
import { similarCarpetsQuery } from "@/lib/api/catalog";

/**
 * Neighbours of this rug's own embedding.
 *
 * The catalogue component's demo ended with a "you might also like" strip of
 * fixed images. This is that strip, filled by the visual-search index the
 * project already has — the same DINOv2 vectors the upload search runs on, so
 * «مشابه» means it looks alike rather than that it shares a tag.
 *
 * Silent when there is nothing to show: a rug whose photograph has not been
 * embedded yet returns an empty list, and a heading over an empty row is worse
 * than no heading.
 */
export function SimilarCarpets({ carpetId }: { carpetId: number }) {
  const { data, isPending } = useQuery(similarCarpetsQuery(carpetId, 4));
  const results = data?.results ?? [];

  if (!isPending && results.length === 0) return null;

  return (
    <section id="similar" className="scroll-mt-24 pt-20">
      <h2 className="text-2xl font-light tracking-tight">فرش‌های مشابه</h2>
      <p className="mt-3 text-sm leading-loose text-muted">
        بر اساس شباهت تصویری، نه برچسب — همان موتوری که جست‌وجوی بصری از آن
        استفاده می‌کند.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
        {isPending
          ? Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="animate-pulse">
                <span className="block aspect-3/4 rounded-md bg-line" />
                <span className="mt-4 block h-3 w-3/4 rounded bg-line" />
              </li>
            ))
          : results.map(({ carpet }, i) => (
              <li key={carpet.id}>
                <CarpetCard carpet={carpet} index={i} />
              </li>
            ))}
      </ul>
    </section>
  );
}
