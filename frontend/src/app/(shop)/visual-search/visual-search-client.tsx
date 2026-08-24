"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { RotateCcw, SearchX } from "lucide-react";

import { CarpetCard } from "@/components/toranjan/carpet-card";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { visualSearch } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { useCompare } from "@/lib/store/compare";
import { useFavorites } from "@/lib/store/favorites";
import type { SimilarItem } from "@/lib/api/types";

/**
 * Search by photograph.
 *
 * The page has two states and one gesture between them. Empty, it is a single
 * large place to drop a photograph, because that is the only thing to do here
 * and a page with one action should look like it. Answered, the photograph
 * shrinks into the corner and the carpets take the room it was holding — the
 * query stays on screen, because every result is a claim about *that* picture
 * and a shopper who cannot see it can no longer judge the answer.
 *
 * `layoutId` is what makes the photograph travel between those two states
 * rather than disappear from one and reappear in the other. It is the same
 * device as the grid-to-product transition, borrowed rather than reinvented.
 *
 * The upload is a mutation and not a query on purpose: it has a side effect on
 * nothing, but it must never be retried on its own initiative, and it has no
 * key worth caching — the same photograph chosen twice is a shopper asking
 * again, not a cache miss.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const QUERY_PHOTO = "visual-search-query-photo";

export function VisualSearchClient() {
  const [preview, setPreview] = React.useState<string | null>(null);
  const reduced = useReducedMotion();
  const favorites = useFavorites();
  const compare = useCompare();

  // Object URLs stay alive until revoked; this releases the one on screen when
  // the visitor leaves the page.
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const search = useMutation({
    mutationFn: (file: File) => visualSearch(file),
  });

  const onUpload = React.useCallback(
    (file: File) => {
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      search.mutate(file);
    },
    [search],
  );

  const reset = React.useCallback(() => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    search.reset();
  }, [search]);

  const results: SimilarItem[] = search.data?.results ?? [];
  const answered = search.isSuccess || search.isError;

  return (
    <div className="pb-28">
      <AnimatePresence mode="wait" initial={false}>
        {!answered ? (
          <motion.div
            key="asking"
            className="mx-auto max-w-[720px]"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <FileDropzone
              onUpload={onUpload}
              isBusy={search.isPending}
              maxSizeMB={8}
              // The one screen that really does want the carpet.
              subject="عکس فرش"
              hint={
                <p className="mt-5 max-w-[38ch] text-xs leading-loose text-muted">
                  عکس از روبه‌رو و صاف بهترین نتیجه را می‌دهد. عکس اتاق هم کار
                  می‌کند، ولی نقش فرش را کمتر نشان می‌دهد.
                </p>
              }
            />

            {/* The photograph is already chosen and the request is in flight —
                said in words, because a spinner inside the button says only
                «something», and this request reads a whole neural network. */}
            {search.isPending && (
              <p className="mt-6 text-center text-sm text-muted" role="status">
                در حال گشتن میان فرش‌ها…
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="answered"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            {/* The query, kept in view — but only when there *was* a query.
                A rejected file never became one: the backend refused to decode
                it, so there is no photograph to compare the answer against and
                no answer either. Showing the strip anyway produced both of the
                things it exists to prevent — a broken image where the preview
                should be, and «نتیجه‌ای پیدا نشد» under a file that was never
                searched, which sends someone off to photograph their carpet
                again when the real problem was the file. */}
            {search.isSuccess && (
              <div className="mb-12 flex items-center gap-4 rounded-lg border border-line bg-paper p-4 shadow-panel">
                {preview && (
                  <motion.img
                    layoutId={reduced ? undefined : QUERY_PHOTO}
                    src={preview}
                    alt="عکسی که فرستادی"
                    className="size-20 rounded-md object-contain"
                    transition={{ duration: 0.52, ease: EASE }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">عکسی که فرستادی</p>
                  <p className="mt-1 text-xs leading-loose text-muted">
                    {results.length > 0
                      ? `${formatNumber(results.length)} فرش نزدیک به این نقش و رنگ`
                      : "فرشی نزدیک به این عکس پیدا نشد"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line-2 px-5 text-sm shadow-panel transition-all duration-[--dur-feedback] hover:-translate-y-px hover:shadow-raised active:translate-y-0 active:scale-[0.98] active:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <RotateCcw className="size-4 text-accent" />
                  عکس دیگری
                </button>
              </div>
            )}

            {search.isError && (
              <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-paper p-10 text-center shadow-panel">
                <p className="text-base leading-loose">{search.error.message}</p>
                {search.error instanceof ApiError && search.error.status === 422 && (
                  <p className="mt-2 text-sm text-muted">
                    فایل باید یک عکس سالم باشد — JPEG، PNG یا WebP.
                  </p>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="mt-6 h-11 rounded-full bg-cta px-6 text-sm text-on-cta shadow-panel transition-all duration-[--dur-feedback] hover:shadow-raised active:scale-[0.98]"
                >
                  دوباره امتحان کن
                </button>
              </div>
            )}

            {search.isSuccess && results.length === 0 && (
              <div className="rounded-lg border border-line bg-paper p-12 text-center shadow-panel">
                <SearchX className="mx-auto size-8 text-muted" aria-hidden="true" />
                <p className="mt-5 text-lg">فرشی نزدیک به این عکس پیدا نشد.</p>
                <p className="mt-3 text-sm leading-loose text-muted">
                  شاید عکس فرش نباشد، یا زاویه‌اش نقش را نشان ندهد.
                </p>
                <Link
                  href="/carpets"
                  className="mt-7 inline-flex h-11 items-center rounded-full bg-cta px-6 text-sm text-on-cta shadow-panel transition-all duration-[--dur-feedback] hover:shadow-raised active:scale-[0.98]"
                >
                  همه‌ی فرش‌ها
                </Link>
              </div>
            )}

            {results.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
                {results.map((result, i) => (
                  <li key={result.carpet.id}>
                    <CarpetCard
                      carpet={result.carpet}
                      index={i}
                      isWishlisted={favorites.has(result.carpet.id)}
                      onWishlistToggle={favorites.toggle}
                      isComparing={compare.has(result.carpet.id)}
                      onCompareToggle={compare.toggle}
                      compareFull={compare.isFull}
                    />
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
