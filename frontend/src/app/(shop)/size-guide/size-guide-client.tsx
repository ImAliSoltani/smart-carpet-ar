"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Ruler, RotateCcw, TriangleAlert } from "lucide-react";

import { FileDropzone } from "@/components/ui/file-dropzone";
import { sizeGuide } from "@/lib/api/room";
import { ApiError } from "@/lib/api/client";
import { formatDecimal, formatNumber } from "@/lib/format";
import type { SizeSuggestion } from "@/lib/api/types";

/**
 * The size guide.
 *
 * One photograph of a room, and the answer to the question the shop is worst at
 * helping with: which size. Everything expensive happens on the server — depth,
 * the floor plane, the sweep over the free floor — so this page's whole job is
 * to set the expectation, wait honestly, and then say what was measured before
 * it says what to buy.
 *
 * That order matters. A recommendation with no measurement behind it is a guess
 * the visitor cannot check; the free rectangle is shown first and in the same
 * units they would use with a tape measure, so the sizes underneath read as a
 * consequence rather than an opinion.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/** The catalogue's size filter takes a range; one size is a range of width 0. */
function sizeHref(size: SizeSuggestion): string {
  const params = new URLSearchParams({
    min_width_cm: String(size.width_cm),
    max_width_cm: String(size.width_cm),
    min_length_cm: String(size.length_cm),
    max_length_cm: String(size.length_cm),
  });
  return `/carpets?${params.toString()}`;
}

function Measured({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-bg px-5 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1.5 text-lg">{value}</p>
    </div>
  );
}

export function SizeGuideClient() {
  const [preview, setPreview] = React.useState<string | null>(null);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const guide = useMutation({ mutationFn: (file: File) => sizeGuide(file) });

  const onUpload = React.useCallback(
    (file: File) => {
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      guide.mutate(file);
    },
    [guide],
  );

  const reset = React.useCallback(() => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    guide.reset();
  }, [guide]);

  const answered = guide.isSuccess || guide.isError;
  const data = guide.data;
  // `recommended` has a default on the server and is therefore optional in the
  // generated types; an empty list is the same answer as an absent one here.
  const recommended = data?.recommended ?? [];

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
              isBusy={guide.isPending}
              maxSizeMB={8}
              hint={
                <div className="mt-5 max-w-[42ch] space-y-2 text-xs leading-loose text-muted">
                  <p>
                    از درِ اتاق عکس بگیرید و کف را باز نگه دارید — هرچه کف بیشتری در
                    کادر باشد، اندازه‌ی پیشنهادی دقیق‌تر است.
                  </p>
                  <p>
                    برای اندازه‌ی دقیق‌تر، یک برگه‌ی A4 روی کف بگذارید و در کادر
                    نگه دارید. ابعاد A4 استاندارد است و همان یک برگه، مقیاس کل عکس
                    را تصحیح می‌کند.
                  </p>
                </div>
              }
            />

            {/* Said in words and with the real number. This request runs a depth
                model over the whole photo; a spinner alone would read as a page
                that has stopped working. */}
            {guide.isPending && (
              <p className="mt-6 text-center text-sm text-muted" role="status">
                در حال اندازه‌گیری کف اتاق… چند ثانیه طول می‌کشد.
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="answered"
            className="mx-auto max-w-[900px]"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.42, ease: EASE }}
          >
            <div className="mb-10 flex items-center gap-4 rounded-lg border border-line bg-paper p-4 shadow-panel">
              {preview && guide.isSuccess && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="اتاقی که فرستادی"
                  className="size-20 rounded-md object-cover"
                />
              )}
              <p className="min-w-0 flex-1 text-sm">
                {guide.isSuccess ? "اتاقی که فرستادی" : "این عکس اندازه‌گیری نشد"}
              </p>
              <button
                type="button"
                onClick={reset}
                className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line-2 px-5 text-sm shadow-panel transition-all duration-[--dur-feedback] hover:-translate-y-px hover:shadow-raised active:translate-y-0 active:scale-[0.98] active:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
              >
                <RotateCcw className="size-4 text-accent" />
                عکس دیگری
              </button>
            </div>

            {guide.isError && (
              <div className="rounded-lg border border-line bg-paper p-10 text-center shadow-panel">
                <p className="text-base leading-loose">{guide.error.message}</p>
                {guide.error instanceof ApiError && guide.error.status === 422 && (
                  <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-loose text-muted">
                    معمولاً یعنی کف اتاق در کادر نبوده یا خیلی کم دیده شده. از
                    درِ اتاق و کمی رو به پایین عکس بگیرید.
                  </p>
                )}
              </div>
            )}

            {data && (
              <>
                {/* The measurement first, the advice second. */}
                <section className="rounded-lg border border-line bg-paper p-6 shadow-panel sm:p-8">
                  <h2 className="flex items-center gap-2 text-sm">
                    <Ruler className="size-4 text-accent" />
                    آنچه اندازه گرفته شد
                  </h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Measured
                      label="بزرگ‌ترین محدوده‌ی آزاد"
                      value={`${formatNumber(data.free_width_cm)} × ${formatNumber(
                        data.free_length_cm,
                      )} سانتی‌متر`}
                    />
                    <Measured
                      label="کل کف در دسترس"
                      value={`${formatDecimal(data.free_area_sqm)} متر مربع`}
                    />
                    <Measured
                      label="ارتفاع دوربین"
                      value={`${formatDecimal(data.camera_height_m)} متر`}
                    />
                  </div>

                  <p className="mt-5 text-xs leading-loose text-muted">
                    {data.scale_reference ? (
                      <>
                        برگه‌ی A4 در عکس پیدا شد و مقیاس را{" "}
                        {formatDecimal(Math.abs(data.scale_reference.correction_percent))}٪
                        تصحیح کرد. این اندازه‌ها بر پایه‌ی یک مرجع واقعی‌اند.
                      </>
                    ) : (
                      <>
                        برگه‌ی A4 در عکس نبود، پس اندازه‌ها تخمینی‌اند و چند درصد خطا
                        دارند. یک برگه روی کف بگذارید و دوباره عکس بگیرید تا دقیق شوند.
                      </>
                    )}
                  </p>

                  {/* Confidence is the floor fit's own number, and a low one
                      changes what the rest of this page is worth. Shown as a
                      warning rather than as a percentage nobody can act on. */}
                  {data.confidence < 0.4 && (
                    <p
                      className="mt-4 flex items-start gap-2 rounded-md bg-confirm-tint px-4 py-3 text-xs leading-loose text-confirm-tint-ink"
                      role="status"
                    >
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      کف اتاق در این عکس با اطمینان کمی تشخیص داده شد. عددها را
                      تقریبی بخوانید و اگر می‌توانید عکسی با کف بازتر بگیرید.
                    </p>
                  )}
                </section>

                <section className="mt-8">
                  <h2 className="text-lg">
                    {recommended.length > 0
                      ? "اندازه‌هایی که در این فضا جا می‌شوند"
                      : "اندازه‌ای که در این فضا جا شود پیدا نشد"}
                  </h2>

                  {recommended.length > 0 ? (
                    <>
                      <p className="mt-3 max-w-[52ch] text-sm leading-loose text-muted">
                        بزرگ‌ترین اندازه اول آمده است. فرش زیر میز جلومبلی می‌رود، پس
                        محدوده‌ی آزاد شامل جایی که میز ایستاده هم هست. اندازه‌های
                        کوچک‌تر هم جا می‌شوند؛ روی هر کدام بزنید تا فرش‌هایش را ببینید.
                      </p>
                      <ul className="mt-6 flex flex-wrap gap-3">
                        {recommended.map((size, i) => (
                          <motion.li
                            key={`${size.width_cm}x${size.length_cm}`}
                            initial={reduced ? false : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.34,
                              ease: EASE,
                              delay: reduced ? 0 : Math.min(i, 8) * 0.04,
                            }}
                          >
                            <Link
                              href={sizeHref(size)}
                              className="flex h-auto flex-col gap-1 rounded-lg border border-line-2 bg-paper px-6 py-4 shadow-panel transition-all duration-[--dur-feedback] hover:-translate-y-px hover:shadow-raised active:translate-y-0 active:scale-[0.98] active:shadow-none motion-reduce:transform-none motion-reduce:transition-none"
                            >
                              <span className="text-base">
                                {formatNumber(size.width_cm)} ×{" "}
                                {formatNumber(size.length_cm)}
                              </span>
                              <span className="text-xs text-muted">
                                {formatNumber(size.carpet_count)} فرش موجود
                              </span>
                            </Link>
                          </motion.li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-3 max-w-[52ch] text-sm leading-loose text-muted">
                      کوچک‌ترین فرش فروشگاه هم در محدوده‌ی اندازه‌گیری‌شده جا نشد.
                      معمولاً یعنی کف کمی از اتاق در کادر بوده — از فاصله‌ی بیشتری
                      عکس بگیرید.
                    </p>
                  )}
                </section>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
