"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { CornerDownLeft, Sparkles } from "lucide-react";

import { CarpetCard } from "@/components/toranjan/carpet-card";
import { conversationalSearch } from "@/lib/api/catalog";
import { formatNumber } from "@/lib/format";
import { useCompare } from "@/lib/store/compare";
import { useFavorites } from "@/lib/store/favorites";

/**
 * Asking the shop for a carpet in a sentence.
 *
 * The interesting part of this page is what it shows *between* the question and
 * the carpets: one chip per decision the search made. A sentence-shaped search
 * that silently narrowed to four colour families has taken a position the
 * visitor cannot argue with — they wrote «روشن» and got eleven carpets, with no
 * way to know whether the shop read that as cream, as white, or as neither.
 *
 * Which is also why the link under the results goes to `/carpets` with the same
 * filters in its query string. This page is a way *into* the catalogue, not a
 * second catalogue: the moment the visitor wants to adjust what was understood,
 * they should be standing in the filter panel that already does that well.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const EXAMPLES = [
  "فرش روشن برای اتاق کودک تا ده میلیون",
  "فرش ابریشم قرمز ۲۰۰ در ۳۰۰",
  "یه فرش سرمه‌ای برای پذیرایی زیر ۵۰ میلیون",
  "فرش ساده و مدرن برای اتاق کار",
];

export function AskClient() {
  const [draft, setDraft] = React.useState("");
  const reduced = useReducedMotion();
  const favorites = useFavorites();
  const compare = useCompare();

  const ask = useMutation({ mutationFn: (q: string) => conversationalSearch(q) });

  const submit = React.useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      setDraft(trimmed);
      ask.mutate(trimmed);
    },
    [ask],
  );

  const data = ask.data;
  const understood = data?.understood ?? [];
  const items = data?.page.items ?? [];

  /** The same narrowing, as a catalogue address the visitor can edit and share. */
  const catalogueHref = React.useMemo(() => {
    if (!data) return "/carpets";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data.filters ?? {})) {
      if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
      else if (value !== null && value !== undefined) params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `/carpets?${qs}` : "/carpets";
  }, [data]);

  return (
    <div className="pb-28">
      <form
        className="mx-auto max-w-[720px]"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <div className="relative">
          <Sparkles className="pointer-events-none absolute top-1/2 start-5 size-4 -translate-y-1/2 text-accent" />
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={200}
            placeholder="چه فرشی می‌خواهید؟"
            aria-label="جست‌وجو با جمله"
            // `text-base` is not styling: iOS Safari zooms into any field under
            // 16px on focus and does not zoom back out.
            className="h-14 w-full rounded-full border border-line-2 bg-paper ps-12 pe-14 text-base shadow-panel outline-none transition-all duration-[--dur-feedback] placeholder:text-muted focus-visible:border-ink focus-visible:shadow-raised"
          />
          <button
            type="submit"
            disabled={ask.isPending || !draft.trim()}
            aria-label="جست‌وجو"
            className="absolute top-1/2 end-2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-cta text-on-cta transition-all duration-[--dur-feedback] hover:bg-cta-hover active:scale-95 disabled:opacity-40 motion-reduce:transform-none"
          >
            <CornerDownLeft className="size-4" />
          </button>
        </div>

        {/* Examples, not placeholder text. A placeholder disappears the moment
            somebody types, which is exactly when they need to know what kinds
            of sentence this box understands. */}
        {!data && !ask.isPending && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => submit(example)}
                  className="rounded-full border border-line px-4 py-2 text-xs leading-relaxed text-muted transition-colors duration-[--dur-feedback] hover:border-line-2 hover:text-ink"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {ask.isPending && (
        <p className="mt-10 text-center text-sm text-muted" role="status">
          در حال خواندن جمله…
        </p>
      )}

      {ask.isError && (
        <div className="mx-auto mt-10 max-w-[720px] rounded-lg border border-line bg-paper p-8 text-center shadow-panel">
          <p className="text-sm leading-loose">{ask.error.message}</p>
        </div>
      )}

      {/* `mode="wait"` is not a taste decision here. Without it the outgoing
          results stay mounted while the incoming ones arrive, and any carpet in
          both answers is named twice at once — which is precisely the condition
          the shared carpet transition cannot survive. It shows up as a console
          error and a transition that silently stops working, never as a broken
          page, so it is the kind of thing that ships. */}
      <AnimatePresence mode="wait" initial={false}>
        {data && (
          <motion.section
            key={draft}
            className="mt-12"
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            {understood.length > 0 ? (
              <div className="mx-auto mb-10 max-w-[900px] rounded-lg border border-line bg-paper p-5 shadow-panel">
                <p className="text-xs text-muted">این‌طور خواندمش</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {understood.map((line) => (
                    <li
                      key={line}
                      className="rounded-full bg-confirm-tint px-4 py-1.5 text-xs text-confirm-tint-ink"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                <Link
                  href={catalogueHref}
                  className="mt-4 inline-block text-xs text-muted underline-offset-4 transition-colors duration-[--dur-feedback] hover:text-ink hover:underline"
                >
                  اگر درست نفهمیدم، در پنل فیلترها اصلاحش کنید ←
                </Link>
              </div>
            ) : (
              <div className="mx-auto mb-10 max-w-[720px] rounded-lg border border-line bg-paper p-8 text-center shadow-panel">
                <p className="text-base leading-loose">از این جمله چیزی نفهمیدم.</p>
                <p className="mx-auto mt-3 max-w-[44ch] text-sm leading-loose text-muted">
                  رنگ، جنس، نقش، اتاق یا قیمت را در جمله بیاورید — مثلاً «فرش
                  ابریشم قرمز برای پذیرایی تا ۵۰ میلیون».
                </p>
              </div>
            )}

            {items.length > 0 ? (
              <>
                <p className="mb-7 text-sm text-muted">
                  {formatNumber(data.page.total)} فرش
                </p>
                <ul className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-4">
                  {items.map((carpet, i) => (
                    <li key={carpet.id}>
                      <CarpetCard
                        carpet={carpet}
                        index={i}
                        isWishlisted={favorites.has(carpet.id)}
                        onWishlistToggle={favorites.toggle}
                        isComparing={compare.has(carpet.id)}
                        onCompareToggle={compare.toggle}
                        compareFull={compare.isFull}
                      />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              understood.length > 0 && (
                <div className="mx-auto rounded-lg border border-line bg-paper p-10 text-center shadow-panel">
                  <p className="text-lg">فرشی با این مشخصات پیدا نشد.</p>
                  <p className="mt-3 text-sm leading-loose text-muted">
                    شاید یکی از شرط‌ها را بردارید — مثلاً بدون قیمت یا بدون رنگ.
                  </p>
                  <Link
                    href="/carpets"
                    className="mt-6 inline-block rounded-full bg-cta px-6 py-2.5 text-sm text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
                  >
                    همه‌ی فرش‌ها
                  </Link>
                </div>
              )
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
