"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImageOff, Loader2 } from "lucide-react";

import { ExpandingSearchDock } from "@/components/ui/expanding-search-dock";
import { carpetListQuery } from "@/lib/api/catalog";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber, formatToman } from "@/lib/format";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * Searching the shop by name, from the header.
 *
 * Until now the magnifier was a link to `/carpets` and the header said so out
 * loud: «there is no search field, the shop is browsed by pattern». That was
 * true of somebody meeting the shop for the first time and false of everybody
 * else — a returning visitor, a buyer told a name over the phone, the
 * shopkeeper checking their own catalogue. `?q=` has been served by the listing
 * endpoint the whole time; nothing in the interface reached it.
 *
 * It suggests as it goes rather than waiting for Enter, which is the point: a
 * name half-typed is enough to recognise a rug by its photograph, and the
 * fastest search is the one you never submit. Enter is still there and still
 * means «all of it», which is the ordinary catalogue page with the query in
 * the URL — a real address, shareable and filterable, rather than a second
 * parallel view of the shop.
 *
 * The matching is the backend's and is more forgiving than a prefix: name,
 * description, and a trigram similarity that survives a missing space or a
 * ی/ي swap. See `_apply_filters` in `services/catalog.py`.
 */

/** Below this a query matches most of the catalogue and suggests nothing. */
const MIN_QUERY = 2;
/** Long enough that a fast typist makes one request, not eight. */
const DEBOUNCE_MS = 250;
/** A panel, not a page. Everything past this is behind «همه‌ی نتیجه‌ها». */
const SUGGESTIONS = 6;

const LISTBOX_ID = "toranjan-search-suggestions";
const optionId = (index: number) => `${LISTBOX_ID}-${index}`;

function useDebounced(value: string, ms: number) {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

export function CarpetSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  // The highlighted suggestion, or -1 for «none — Enter means see them all».
  const [active, setActive] = React.useState(-1);

  const settled = useDebounced(query.trim(), DEBOUNCE_MS);
  const asking = settled.length >= MIN_QUERY;

  const results = useQuery({
    ...carpetListQuery({ q: settled, page_size: SUGGESTIONS }),
    enabled: open && asking,
    // Without this the panel empties between keystrokes and the whole thing
    // flashes; with it the previous answer stays on screen, greyed, until the
    // next one lands.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const items = asking ? (results.data?.items ?? []) : [];
  const total = results.data?.total ?? 0;

  // A new answer invalidates whichever row was highlighted — the third row of
  // the old results is not the third row of the new ones, and Enter would open
  // a carpet the visitor never saw.
  //
  // Adjusted during render rather than in an effect, which is the same shape
  // the AR review screen uses to reseed its handles: as an effect this paints
  // once with the previous query's highlight before correcting itself, and the
  // lint rule that forbids it is right about why.
  const [highlightFor, setHighlightFor] = React.useState(settled);
  if (highlightFor !== settled) {
    setHighlightFor(settled);
    setActive(-1);
  }

  const seeAll = React.useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/carpets?q=${encodeURIComponent(q)}`);
  }, [query, router]);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(-1);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!items.length) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      // -1 is a real position in the ring, not a missing one: arrowing past
      // the last row lands back on «none», which is where Enter means «all of
      // them». Cycling straight from the last row to the first would make that
      // option unreachable from the keyboard.
      setActive((prev) => {
        const next = prev + step;
        if (next >= items.length) return -1;
        if (next < -1) return items.length - 1;
        return next;
      });
      return;
    }
    if (event.key === "Enter" && active >= 0 && items[active]) {
      event.preventDefault();
      const slug = items[active].slug;
      close();
      router.push(`/carpets/${slug}`);
    }
  };

  const showPanel = open && asking;

  return (
    <ExpandingSearchDock
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      value={query}
      onValueChange={setQuery}
      onSubmit={seeAll}
      placeholder="نام فرش را بنویسید…"
      inputProps={{
        role: "combobox",
        "aria-expanded": showPanel,
        "aria-controls": LISTBOX_ID,
        "aria-autocomplete": "list",
        "aria-activedescendant": active >= 0 ? optionId(active) : undefined,
        onKeyDown,
      }}
    >
      {showPanel && (
        <div className="absolute top-full inset-x-0 mt-2 overflow-hidden rounded-2xl border border-line bg-paper shadow-raised">
          {/* Announced rather than merely drawn: someone using a screen reader
              gets the count without arrowing through the list to find out. */}
          <p className="sr-only" role="status" aria-live="polite">
            {results.isPending
              ? "در حال جست‌وجو"
              : items.length === 0
                ? "فرشی پیدا نشد"
                : `${items.length} پیشنهاد`}
          </p>

          {results.isPending ? (
            // Three rows of the real height, so the panel does not resize under
            // the pointer the moment the answer arrives.
            <ul className="p-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-3 p-2">
                  <span className="size-12 shrink-0 animate-pulse rounded-md bg-line" />
                  <span className="flex-1">
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-line" />
                    <span className="mt-2 block h-2.5 w-1/3 animate-pulse rounded bg-line" />
                  </span>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            // Never a bare «۰ نتیجه». A dead end that offers nothing is the one
            // thing a search must not do — so it names two ways on.
            <div className="px-4 py-6 text-center">
              <p className="text-[14px] leading-loose">
                فرشی به نام «{settled}» پیدا نشد.
              </p>
              <p className="mt-1.5 text-[12.5px] leading-loose text-muted">
                شاید نامش را جور دیگری بنویسند — می‌توانید{" "}
                <Link
                  href="/carpets"
                  onClick={close}
                  className="text-accent underline underline-offset-4"
                >
                  همه‌ی فرش‌ها
                </Link>{" "}
                را ببینید یا با{" "}
                <Link
                  href="/visual-search"
                  onClick={close}
                  className="text-accent underline underline-offset-4"
                >
                  عکس
                </Link>{" "}
                بگردید.
              </p>
            </div>
          ) : (
            <>
              <ul
                id={LISTBOX_ID}
                role="listbox"
                aria-label="پیشنهادها"
                className={cn(
                  "max-h-[min(60vh,26rem)] overflow-y-auto p-2",
                  // The previous answer, while the next one is in flight.
                  results.isFetching && "opacity-60",
                )}
              >
                {items.map((carpet, index) => {
                  const cover = mediaUrl(carpet.primary_image ?? carpet.cover_image);
                  return (
                    <li key={carpet.id} role="option" id={optionId(index)} aria-selected={index === active}>
                      <Link
                        href={`/carpets/${carpet.slug}`}
                        onClick={close}
                        // Highlighted by the keyboard *and* by the pointer, and
                        // the two share one piece of state — otherwise arrowing
                        // down while the pointer rests on row two lights up two
                        // rows and neither of them is wrong.
                        onPointerEnter={() => setActive(index)}
                        tabIndex={-1}
                        className={cn(
                          "flex items-center gap-3 rounded-lg p-2 transition-colors duration-[--dur-feedback]",
                          index === active && "bg-bg",
                        )}
                      >
                        <span className="relative block size-12 shrink-0 overflow-hidden rounded-md bg-bg">
                          {cover ? (
                            <Image
                              src={cover}
                              alt=""
                              fill
                              sizes="48px"
                              // `contain`: the catalogue's flat shots are cut
                              // out to the weave, and cropping one cuts the
                              // border off the pattern.
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
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{carpet.name}</span>
                          <span className="mt-0.5 block text-[12px] text-muted">
                            {PATTERN_LABEL[carpet.pattern]} · {MATERIAL_LABEL[carpet.material]}
                          </span>
                        </span>
                        <span className="shrink-0 text-[12.5px] text-muted">
                          {formatToman(carpet.min_price)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* The count is in the label rather than in the line. «دیدن
                  همه‌ی ۲۴ نتیجه» puts a figure that changes on every keystroke
                  in the middle of a sentence, and the eye follows it instead of
                  the list above; a reader, which cannot see the list, is given
                  it. */}
              <button
                type="submit"
                aria-label={`دیدن همه‌ی ${formatNumber(total)} نتیجه برای ${settled}`}
                className="flex h-12 w-full items-center justify-between border-t border-line px-4 text-[13px] text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-bg hover:text-ink"
              >
                <span className="flex items-center gap-2">
                  {results.isFetching && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                  دیدن همه‌ی نتیجه‌ها
                </span>
                <ArrowLeft className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      )}
    </ExpandingSearchDock>
  );
}
