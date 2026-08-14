"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";

import { CarpetCard } from "@/components/toranjan/carpet-card";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { roomAdviser } from "@/lib/api/room";
import { useCompare } from "@/lib/store/compare";
import { useFavorites } from "@/lib/store/favorites";
import { COLOR_LABEL, COLOR_SWATCH } from "@/lib/taxonomy";
import type { ColorFamily } from "@/lib/api/types";

/**
 * The layout adviser (ROADMAP §6-6).
 *
 * Every carpet here arrives with the sentences that put it there, and the panel
 * above them shows what the photograph was read as — the floor's colours, the
 * room's, whether it was judged pale or busy. That order is the whole design:
 * the premise first, then the conclusions drawn from it. A shopper who
 * disagrees with «اتاق شما کم‌رنگ است» can stop reading rather than wonder why
 * the shop keeps offering them red.
 *
 * A caution is drawn apart from the reasons and in a different colour. Folding
 * «با کف اتاق شما هم‌رنگ است» in among three compliments is how it goes unread,
 * and it is the one line here that could save somebody a purchase.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

function Swatches({ families }: { families: ColorFamily[] }) {
  if (families.length === 0) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {families.map((family) => (
        <span key={family} className="inline-flex items-center gap-1">
          <span
            aria-hidden="true"
            className="size-3 rounded-full border border-ink/15"
            style={{ backgroundColor: COLOR_SWATCH[family] }}
          />
          {COLOR_LABEL[family]}
        </span>
      ))}
    </span>
  );
}

export function RoomAdviserClient() {
  const [preview, setPreview] = React.useState<string | null>(null);
  const reduced = useReducedMotion();
  const favorites = useFavorites();
  const compare = useCompare();

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const advice = useMutation({ mutationFn: (file: File) => roomAdviser(file) });

  const onUpload = React.useCallback(
    (file: File) => {
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      advice.mutate(file);
    },
    [advice],
  );

  const reset = React.useCallback(() => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    advice.reset();
  }, [advice]);

  const answered = advice.isSuccess || advice.isError;
  const data = advice.data;
  const suggestions = data?.suggestions ?? [];

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
              isBusy={advice.isPending}
              maxSizeMB={8}
              hint={
                <p className="mt-5 max-w-[42ch] text-xs leading-loose text-muted">
                  عکسی بگیرید که هم کف اتاق و هم دیوارها و مبلمان در آن باشند —
                  فرش با هر دو سر و کار دارد و ما هر دو را جدا می‌خوانیم.
                </p>
              }
            />

            {advice.isPending && (
              <p className="mt-6 text-center text-sm text-muted" role="status">
                در حال خواندن رنگ‌های اتاق…
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
            {advice.isError ? (
              <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-paper p-10 text-center shadow-panel">
                <p className="text-base leading-loose">{advice.error.message}</p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-6 h-11 rounded-full bg-cta px-6 text-sm text-on-cta shadow-panel transition-all duration-[--dur-feedback] hover:shadow-raised active:scale-[0.98]"
                >
                  عکس دیگری بفرستید
                </button>
              </div>
            ) : (
              data && (
                <>
                  {/* The premise, before anything is concluded from it. */}
                  <div className="mb-12 rounded-lg border border-line bg-paper p-5 shadow-panel">
                    <div className="flex flex-wrap items-start gap-5">
                      {preview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt="عکس اتاق شما"
                          className="h-28 w-40 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <dl className="min-w-[16rem] flex-1 space-y-2 text-xs leading-loose">
                        <div className="flex gap-2">
                          <dt className="text-muted">کف فعلی:</dt>
                          <dd>
                            <Swatches families={data.reading.floor_colors ?? []} />
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">دیوار و مبلمان:</dt>
                          <dd>
                            <Swatches families={data.reading.room_colors ?? []} />
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">برداشت کلی:</dt>
                          <dd>
                            {data.reading.colourfulness < 0.15
                              ? "اتاقی کم‌رنگ"
                              : data.reading.colourfulness > 0.4
                                ? "اتاقی پُررنگ"
                                : "اتاقی متعادل"}
                            {data.reading.lightness < 0.38 ? "، کم‌نور" : ""}
                          </dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        onClick={reset}
                        className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line-2 px-5 text-sm shadow-panel transition-all duration-[--dur-feedback] hover:-translate-y-px hover:shadow-raised active:translate-y-0 active:scale-[0.98] active:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        <RotateCcw className="size-4 text-accent" />
                        عکس دیگری
                      </button>
                    </div>

                    {/* Said where the numbers are, not in a footnote. */}
                    {data.confidence < 0.4 && (
                      <p className="mt-4 flex items-start gap-2 text-xs leading-loose text-muted">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-accent" />
                        کف اتاق در این عکس خوب تشخیص داده نشد، پس رنگ‌ها را با
                        احتیاط بخوانید.
                      </p>
                    )}
                  </div>

                  {suggestions.length === 0 ? (
                    <div className="mx-auto max-w-[720px] rounded-lg border border-line bg-paper p-10 text-center shadow-panel">
                      <p className="text-lg">برای این اتاق پیشنهاد مطمئنی ندارم.</p>
                      <p className="mt-3 text-sm leading-loose text-muted">
                        عکسی که هم کف و هم دیوارها در آن دیده شوند نتیجه‌ی بهتری
                        می‌دهد.
                      </p>
                      <Link
                        href="/carpets"
                        className="mt-6 inline-block rounded-full bg-cta px-6 py-2.5 text-sm text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
                      >
                        همه‌ی فرش‌ها
                      </Link>
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                      {suggestions.map((item, i) => (
                        <li key={item.carpet.id} className="flex flex-col">
                          <CarpetCard
                            carpet={item.carpet}
                            index={i}
                            isWishlisted={favorites.has(item.carpet.id)}
                            onWishlistToggle={favorites.toggle}
                            isComparing={compare.has(item.carpet.id)}
                            onCompareToggle={compare.toggle}
                            compareFull={compare.isFull}
                          />
                          <ul className="mt-4 space-y-1.5">
                            {(item.reasons ?? []).map((reason) => (
                              <li
                                key={reason}
                                className="flex items-start gap-2 text-xs leading-loose text-ink-2"
                              >
                                <Check className="mt-1 size-3 shrink-0 text-accent" />
                                {reason}
                              </li>
                            ))}
                            {item.caution && (
                              <li className="flex items-start gap-2 text-xs leading-loose text-muted">
                                <AlertTriangle className="mt-1 size-3 shrink-0" />
                                {item.caution}
                              </li>
                            )}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-14 text-center text-sm leading-loose text-muted">
                    اندازه‌اش را هم می‌خواهید؟{" "}
                    <Link
                      href="/size-guide"
                      className="text-ink underline-offset-4 transition-colors duration-[--dur-feedback] hover:underline"
                    >
                      همین عکس را به راهنمای اندازه بدهید
                    </Link>
                    .
                  </p>
                </>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
