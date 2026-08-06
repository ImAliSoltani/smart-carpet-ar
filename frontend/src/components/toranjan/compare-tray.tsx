"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Scale, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { carpetListQuery } from "@/lib/api/catalog";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { COMPARE_LIMIT, useCompare } from "@/lib/store/compare";

/**
 * The shortlist, following the reader around.
 *
 * **Why a tray and not a header icon.** The header is out of room, and this is
 * measured rather than felt: the note above `FLAT_LINKS` records that a third
 * flat link puts the 1024 bar at 1047px of 1009 and the whole site scrolls
 * sideways. A fifth tool in the cluster spends the same budget. So the way to
 * the comparison is a bar that is only there when there is something to compare
 * — which is also the better answer, because a shortlist of one is not yet worth
 * a page and the tray can say so.
 *
 * It is the shortlist's only permanent home in the chrome. The footer carries a
 * link for the case where somebody wants the empty page, and nothing else needs
 * to: with an empty shortlist there is nothing to go back to.
 */
export function CompareTray() {
  const compare = useCompare();
  const pathname = usePathname();
  const reduced = useReducedMotion();

  const { data } = useQuery({
    ...carpetListQuery({ id: compare.ids, page_size: COMPARE_LIMIT }),
    enabled: compare.ids.length > 0,
    // The tray shows a thumbnail and a name. The table asks for the same rows a
    // moment later and shares this cache entry, so opening it costs nothing.
    staleTime: 5 * 60 * 1000,
  });

  // On the comparison page the tray would be a second copy of the thing being
  // looked at, and a fixed bar over the bottom of a table that scrolls.
  const onComparePage = pathname === "/compare";
  const open = compare.hydrated && compare.ids.length > 0 && !onComparePage;

  const byId = new Map((data?.items ?? []).map((carpet) => [carpet.id, carpet]));
  // Store order, not response order — these are the columns, in the order they
  // were chosen.
  const chosen = compare.ids.map((id) => ({ id, carpet: byId.get(id) }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          // Never a branch on `useReducedMotion` to pick `initial`: the server
          // and the browser answer it differently and the page fails to
          // hydrate. The hook zeroes the distance instead.
          initial={{ y: reduced ? 0 : 96, opacity: reduced ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: reduced ? 0 : 96, opacity: reduced ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 0.44, ease: [0.16, 1, 0.3, 1] }}
          // `sticky`, not `fixed`. A fixed bar hovers over the bottom of the
          // page and eats the last two lines of the footer, and the usual
          // remedy — padding the body by the bar's height — means measuring a
          // bar whose height moves with the copy inside it. Sticky is the same
          // picture with none of that: it is the last element in the flow, so
          // it floats above the page while there is page left and comes to rest
          // under the footer at the end. Nothing is ever covered.
          className="sticky bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-md shadow-[0_-18px_44px_-32px_rgba(24,24,27,0.55)]"
          role="region"
          aria-label="فهرست مقایسه"
        >
          <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-5 py-3 sm:gap-5 sm:px-8">
            {/* The thumbnails are the whole point of the bar: they are what
                tells someone who has been scrolling for five minutes which four
                carpets they picked. The empty slots are there for the same
                reason a shopping list has lines — they say how many more the
                table will take.

                **Everything but the pictures and the button goes at 375.** Four
                thumbnails at 56px, a corner cross on each, a count and a «پاک
                کردن» want 412px of a 375px bar, and the site scrolls sideways —
                measured, the same failure the wordmark was stacked to fix. So on
                a phone the discs shrink to 44, the crosses go (the card's own
                toggle removes a carpet, and the table has a cross per column),
                the empty slots go, and the count goes with them: four pictures
                already say four. */}
            <ul className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {chosen.map(({ id, carpet }) => {
                const image = mediaUrl(carpet?.primary_image);
                return (
                  <li key={id} className="relative">
                    <span className="grid size-11 place-items-center overflow-hidden rounded border border-line bg-bg sm:size-16">
                      {image && (
                        <Image
                          src={image}
                          alt={carpet?.name ?? ""}
                          width={64}
                          height={64}
                          className="size-full object-contain p-1"
                        />
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => compare.remove(id)}
                      aria-label={
                        carpet ? `برداشتن ${carpet.name} از مقایسه` : "برداشتن از مقایسه"
                      }
                      // 44px of hit area hanging off the corner of a 64px
                      // thumbnail, with a 20px disc drawn inside it — the same
                      // trade the card's corner controls make.
                      className="absolute -end-3 -top-3 hidden size-11 place-items-center sm:grid"
                    >
                      <span className="grid size-5 place-items-center rounded-full border border-line bg-paper text-ink-2 shadow-sm transition-colors duration-[--dur-feedback] hover:border-cta hover:bg-cta hover:text-on-cta">
                        <X className="size-3" />
                      </span>
                    </button>
                  </li>
                );
              })}

              {Array.from({ length: COMPARE_LIMIT - chosen.length }).map((_, i) => (
                <li
                  key={`slot-${i}`}
                  aria-hidden
                  className="hidden rounded border border-dashed border-line-2 sm:grid sm:size-16"
                />
              ))}
            </ul>

            <div className="min-w-0 flex-1">
              <p className="hidden text-sm sm:block">
                {formatNumber(chosen.length)} فرش برای مقایسه
              </p>
              <p className="mt-0.5 hidden text-xs leading-relaxed text-muted sm:block">
                {chosen.length === 1
                  ? "یک فرش دیگر انتخاب کنید تا کنار هم ببینیدشان."
                  : `تا ${formatNumber(COMPARE_LIMIT)} فرش کنار هم.`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={compare.clear}
                className="hidden h-11 rounded-full px-4 text-[13px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink sm:block"
              >
                پاک کردن
              </button>
              {/* One carpet is a product page, not a comparison. The button
                  stays visible and goes quiet rather than disappearing — a
                  control that vanishes when you remove an item is a control
                  nobody learns. The branch is on the element, not on a prop:
                  `disabled` forwarded through `asChild` lands on an anchor,
                  where it means nothing and warns. */}
              {chosen.length > 1 ? (
                <Button asChild className="h-11 gap-2 rounded-full px-5 text-[13.5px]">
                  <Link href="/compare">
                    <Scale className="size-4" />
                    مقایسه
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled
                  title="دست‌کم دو فرش انتخاب کنید"
                  className="h-11 gap-2 rounded-full px-5 text-[13.5px]"
                >
                  <Scale className="size-4" />
                  مقایسه
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
