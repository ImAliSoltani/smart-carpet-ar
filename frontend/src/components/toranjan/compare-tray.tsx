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
import { cn } from "@/lib/utils";

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
/**
 * Shuts the bar in one press.
 *
 * It empties the shortlist, and the label says so rather than only saying
 * «close»: the bar exists only while there is something in it, so there is no
 * way to put it away that leaves the list untouched — a dismissed bar with four
 * carpets still chosen would be a shortlist with nowhere to reach it. Naming it
 * for both halves is the honest version of the same press.
 *
 * Nothing is lost that is expensive to rebuild: the list is four taps, it is
 * gone at the end of the visit anyway, and each picture removes itself
 * one at a time for the case where only one is wrong.
 */
function CloseTray({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="بستن نوار و پاک کردن فهرست مقایسه"
      title="بستن نوار و پاک کردن فهرست مقایسه"
      // 44px of target with a 32px disc drawn inside it — the same trade the
      // card's corner controls make, and for the same reason: §3-5's floor is on
      // the area a thumb has to find, not on the amount of paper that has to be
      // painted. A bare 44px circle of hover colour on a quiet bar is a lot of
      // furniture for a control most people never press.
      className={cn("group grid size-11 shrink-0 place-items-center rounded-full", className)}
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full border border-line-2 text-muted",
          // Colour and border move together on hover so the disc reads as one
          // object filling in, rather than an icon that changed colour inside a
          // ring that did not.
          "transition-[background-color,border-color,color] duration-[--dur-feedback]",
          "group-hover:border-cta group-hover:bg-cta group-hover:text-on-cta",
          "group-focus-visible:border-cta group-focus-visible:bg-cta group-focus-visible:text-on-cta",
          // A press that gives nothing back reads as a press that missed.
          "group-active:scale-95",
        )}
      >
        <X className="size-3.5" strokeWidth={2} />
      </span>
    </button>
  );
}

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
          // Rounded across the top only, so the bar reads as a sheet that has
          // risen over the page rather than a strip welded to the bottom of the
          // window. The corners are the one edge that is ever seen — the bottom
          // two sit against the end of the page — so `rounded-t-2xl` and
          // nothing else. `overflow-hidden` would make this a scrollport and
          // break `sticky`, which is already written down; the corners are
          // clipped by the radius on this element alone, and nothing inside
          // reaches them.
          className="sticky bottom-0 z-40 rounded-t-2xl border-x border-t border-line bg-paper/95 backdrop-blur-md shadow-[0_-18px_44px_-32px_rgba(24,24,27,0.55)]"
          role="region"
          aria-label="فهرست مقایسه"
        >
          {/* Tighter vertical padding on a phone. The strip above the row is
              44px tall whatever is written in it, because that is the close
              button's own target size, and a sticky bar 121px deep on an 812px
              screen is a seventh of it. */}
          <div className="mx-auto w-full max-w-7xl px-5 py-2 sm:px-8 sm:py-3">
            {/* A phone gets its own strip for this, because the row below has
                no room to give: measured at 375, it spends 335px of the 335px
                it has, so a fifth control does not fit on that line at any
                size. Height is the axis that is free. The count comes back with
                it — it was dropped from the row for exactly the same width
                reason. */}
            <div className="flex items-center justify-between sm:hidden">
              <p className="text-xs text-muted">
                {formatNumber(chosen.length)} فرش برای مقایسه
              </p>
              <CloseTray onClose={compare.clear} className="-me-2" />
            </div>

            <div className="flex items-center gap-2 sm:gap-5">
            {/* The thumbnails are the whole point of the bar: they are what
                tells someone who has been scrolling for five minutes which four
                carpets they picked. The empty slots are there for the same
                reason a shopping list has lines — they say how many more the
                table will take.

                **The picture is the remove control, and that is what fixed the
                phone.** The cross used to be a 44px target hung off the corner
                of the thumbnail, and it could only be afforded from `sm` up:
                measured at 375, this row uses 335px of the 335px it has, so
                there was no width for a fifth thing — and on a phone the
                shortlist could be seen but not edited. Moving the target onto
                the picture costs nothing, because the picture is already 44px
                and was doing nothing at all. The × is drawn inside its corner
                as the affordance.

                It retires the old outside-hanging cross with its own recorded
                bug — an `absolute` child ten pixels past the row counted in
                `scrollWidth` — and leaves one structure for every width instead
                of a phone shape and a desktop shape.

                Still gone at 375: the empty slots and the count. Four pictures
                already say four. */}
            <ul className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {chosen.map(({ id, carpet }) => {
                const image = mediaUrl(carpet?.primary_image);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => compare.remove(id)}
                      aria-label={
                        carpet ? `برداشتن ${carpet.name} از مقایسه` : "برداشتن از مقایسه"
                      }
                      className="group relative grid size-11 place-items-center overflow-hidden rounded border border-line bg-bg transition-colors duration-[--dur-feedback] hover:border-cta sm:size-16"
                    >
                      {image && (
                        <Image
                          src={image}
                          alt={carpet?.name ?? ""}
                          width={64}
                          height={64}
                          className="size-full object-contain p-1"
                        />
                      )}
                      <span
                        aria-hidden
                        className="absolute end-0.5 top-0.5 grid size-4 place-items-center rounded-full border border-line bg-paper text-ink-2 shadow-sm transition-colors duration-[--dur-feedback] group-hover:border-cta group-hover:bg-cta group-hover:text-on-cta sm:size-5"
                      >
                        <X className="size-2.5 sm:size-3" />
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
              {/* The same control as the one in the phone's strip above, from
                  `sm` up where the row can afford it. One definition, two
                  places it is mounted — the alternative is two crosses that
                  drift. */}
              <CloseTray onClose={compare.clear} className="hidden sm:grid" />
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
