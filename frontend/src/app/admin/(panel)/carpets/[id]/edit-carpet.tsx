"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";

import { CarpetForm, type CarpetFormResult } from "@/components/toranjan/carpet-form";
import { ENTER, GoldRule, staggerDelay } from "@/components/toranjan/admin-motion";
import { useToast } from "@/components/toranjan/admin-toast";
import { adminCarpetQuery, adminKeys, updateCarpet } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { ImageManager } from "./image-manager";
import { VariantEditor } from "./variant-editor";

/**
 * One carpet, edited (ROADMAP §6-15).
 *
 * Three panels that write independently — description, sizes, photographs —
 * rather than one form with a single save. They touch three different
 * endpoints, and a save button that pretended to commit all three at once
 * would have to explain what it means when the middle one fails.
 */
export function EditCarpet({ carpetId }: { carpetId: number }) {
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { show } = useToast();
  const [failure, setFailure] = React.useState<string | null>(null);

  const carpet = useQuery(adminCarpetQuery(carpetId));

  const save = useMutation({
    mutationFn: (values: CarpetFormResult) =>
      // Named field by field rather than spread-minus-slug. `CarpetUpdate` has
      // no `slug`, and a payload assembled by subtraction quietly starts
      // sending whatever the form gains next.
      updateCarpet(carpetId, {
        name: values.name,
        description: values.description,
        pattern: values.pattern,
        material: values.material,
        origin: values.origin,
        // `undefined`, not `[]`, when the field is left empty — and that
        // distinction is a bug this screen used to have. The backend fills the
        // colours from the first photograph, but only while the carpet has
        // none; sending an empty array afterwards *cleared* what it had just
        // extracted, and the shop's card lost its colour dots. Empty here means
        // «leave them alone», which is what the field's own hint promises.
        colors: values.colors.length ? values.colors : undefined,
        suitable_rooms: values.suitable_rooms,
      }),
    onMutate: () => setFailure(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      show("مشخصات فرش ذخیره شد.");
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : "ذخیره‌ی تغییرات انجام نشد.";
      setFailure(message);
      show(message, "failure");
    },
  });

  const toggleActive = useMutation({
    mutationFn: (next: boolean) => updateCarpet(carpetId, { is_active: next }),
    onSuccess: (_result, next) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      show(next ? "فرش فعال شد و در فروشگاه دیده می‌شود." : "فرش غیرفعال شد.");
    },
    onError: () => show("تغییر وضعیت فرش انجام نشد.", "failure"),
  });

  if (carpet.isPending) {
    return <div className="glass h-96 animate-pulse rounded-xl" aria-hidden />;
  }

  if (carpet.error) {
    return (
      <div className="glass rounded-xl px-6 py-16 text-center">
        <p className="text-[15px]">{carpet.error.message}</p>
        <Link
          href="/admin/carpets"
          className="mt-5 inline-flex h-11 items-center rounded-full px-5 text-[13.5px] text-accent"
        >
          بازگشت به فرش‌ها
        </Link>
      </div>
    );
  }

  const data = carpet.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/carpets"
          className="-ms-3 inline-flex h-11 items-center gap-1.5 px-3 text-[13.5px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
        >
          <ArrowRight className="size-4" strokeWidth={1.5} />
          فرش‌ها
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Only offered while it is active — an inactive carpet answers 404
              in the shop, and a link that lands on «not found» is worse than
              no link. */}
          {data.is_active && (
            <Link
              href={`/carpets/${data.slug}`}
              target="_blank"
              rel="noopener"
              className="flex h-11 items-center gap-1.5 rounded-full border border-line-2 px-4 text-[13.5px] transition-colors duration-[--dur-feedback] hover:border-line"
            >
              <ExternalLink className="size-4" strokeWidth={1.5} />
              دیدن در فروشگاه
            </Link>
          )}

          <button
            type="button"
            onClick={() => toggleActive.mutate(!data.is_active)}
            disabled={toggleActive.isPending}
            className={cn(
              "flex h-11 items-center gap-2 rounded-full border px-4 text-[13.5px]",
              "transition-colors duration-[--dur-feedback] disabled:opacity-60",
              // Red while it *would* deactivate, green while it would bring the
              // carpet back. The button is named for what it does next, so its
              // colour has to answer the same question — a grey «غیرفعال کردن»
              // reads as one more quiet control on a page full of them.
              data.is_active
                ? "border-status-cancelled/40 text-status-cancelled hover:bg-status-cancelled/10"
                : "border-status-confirmed/40 text-status-confirmed hover:bg-status-confirmed/10",
            )}
          >
            {toggleActive.isPending && <Loader2 className="size-4 animate-spin" />}
            {data.is_active ? "غیرفعال کردن" : "فعال کردن"}
          </button>
        </div>
      </div>

      {!data.is_active && (
        <p className="rounded-xl border border-status-cancelled/40 bg-status-cancelled/10 px-5 py-4 text-[13.5px] leading-loose text-ink-2">
          این فرش غیرفعال است: در فروشگاه دیده نمی‌شود و سفارش تازه‌ای برایش ثبت نمی‌شود.
          سفارش‌های قبلی دست‌نخورده می‌مانند.
        </p>
      )}

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ENTER}
        className="glass relative rounded-xl p-5 shadow-panel sm:p-6"
      >
        <GoldRule delay={0.15} />

        <h2 className="mb-5 text-[16px] font-medium">مشخصات</h2>

        <CarpetForm
          // Keyed on the colours so the form re-reads its defaults when they
          // change from *outside* it. Uploading the first photograph fills them
          // on the server, and react-hook-form reads `defaultValues` once at
          // mount — without this the field stayed visibly empty and the next
          // save sent that emptiness back.
          key={data.colors.join(",")}
          carpet={data}
          submitLabel="ذخیره‌ی مشخصات"
          submitting={save.isPending}
          onSubmit={(values) => save.mutate(values)}
        />

        {failure && (
          <p
            role="alert"
            className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-[13px] leading-loose"
          >
            {failure}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...ENTER, delay: reduced ? 0 : staggerDelay(1) }}
      >
        <VariantEditor carpet={data} />
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...ENTER, delay: reduced ? 0 : staggerDelay(2) }}
      >
        <ImageManager carpet={data} />
      </motion.div>
    </div>
  );
}
