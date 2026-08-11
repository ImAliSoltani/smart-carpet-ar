"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, Cuboid, RotateCcw, X } from "lucide-react";

import { CornerEditor } from "@/components/toranjan/corner-editor";
import { GoldRule, Rise } from "@/components/toranjan/admin-motion";
import { useToast } from "@/components/toranjan/admin-toast";
import {
  adminCarpetQuery,
  adminKeys,
  arStatusQuery,
  cornersQuery,
  generateArAssets,
} from "@/lib/api/admin";
import { mediaUrl } from "@/lib/api/client";
import type { ArVariantStatus, CornerPoint, ImageOut } from "@/lib/api/types";
import { formatNumber, formatSize } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One carpet's AR review (ROADMAP §6-16).
 *
 * Three reads and one write. The reads are the carpet (for its photograph), the
 * detected corners, and the per-size state of the files; the write is the
 * pipeline, which behaves as two different things depending on how it is called
 * and has to be presented as two different things:
 *
 * - **With corners** it runs inline and answers `ready`. A person placed those
 *   handles, so a mistake has to surface while they are still looking at it —
 *   but it means perspective-correcting the photograph and writing a `glb` and
 *   a `usdz` for *every* size before the response comes back, which is tens of
 *   seconds. The wait is shown as a wait, with the count of what is being built
 *   and the seconds going up, because a spinner that never explains itself is
 *   indistinguishable from one that has hung.
 * - **Without corners** it queues and answers `processing`. That one is polled
 *   until nothing is processing any more — and *only* that one. Polling after
 *   an inline `ready` is asking a question that was already answered.
 *
 * The corners live in local state seeded from the query, adjusted during render
 * rather than in an effect: as an effect the editor paints once with the old
 * photograph's corners, which is a visible jump of four handles.
 */

const STATUS: Record<string, { label: string; className: string; dot: string }> = {
  ready: {
    label: "آماده",
    className: "border-status-confirmed/35 bg-status-confirmed/12 text-status-confirmed",
    dot: "bg-status-confirmed",
  },
  processing: {
    label: "در حال ساخت",
    className: "border-status-waiting/35 bg-status-waiting/12 text-status-waiting",
    dot: "bg-status-waiting",
  },
  missing: {
    label: "ساخته نشده",
    className: "border-line-2 bg-white/[0.04] text-muted",
    dot: "border border-muted bg-transparent",
  },
  failed: {
    label: "شکست خورد",
    className: "border-status-cancelled/40 bg-status-cancelled/12 text-status-cancelled",
    dot: "bg-status-cancelled",
  },
};

function StatusPill({ status }: { status: string }) {
  const tone = STATUS[status] ?? STATUS.missing;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px]",
        tone.className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}

/** The photograph the pipeline reads — the same one the backend picks. */
function primaryImage(images: ImageOut[] | undefined): ImageOut | undefined {
  if (!images?.length) return undefined;
  return [...images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
  )[0];
}

export function ArReview({ carpetId }: { carpetId: number }) {
  const queryClient = useQueryClient();
  const { show } = useToast();

  const carpet = useQuery(adminCarpetQuery(carpetId));
  const corners = useQuery(cornersQuery(carpetId));
  const ar = useQuery({
    ...arStatusQuery(carpetId),
    // Only the queued path leaves anything to watch, and this stops on its own
    // when nothing is processing — so an inline build is never polled.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((v) => v.ar_status === "processing") ? 2500 : false,
  });

  const detected = corners.data?.corners;

  const [draft, setDraft] = React.useState<CornerPoint[] | null>(null);
  const [lastDetected, setLastDetected] = React.useState<CornerPoint[] | undefined>(undefined);
  if (detected !== lastDetected) {
    setLastDetected(detected);
    setDraft(detected ? detected.map((c) => ({ ...c })) : null);
  }

  // State rather than a ref, because the figure below is worked out during
  // render and a ref read there is the other half of the same rule: a ref is
  // for values rendering does not depend on, and this one is rendered.
  const [startedAt, setStartedAt] = React.useState(0);

  const generate = useMutation({
    mutationFn: (manual: CornerPoint[] | undefined) => generateArAssets(carpetId, manual),
    onMutate: () => setStartedAt(Date.now()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.ar(carpetId) });
      // The queue's readiness figures came from a different endpoint and are now
      // wrong; so is the dashboard's counter.
      queryClient.invalidateQueries({ queryKey: adminKeys.arQueue() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      show(
        result.status === "ready"
          ? "فایل‌های واقعیت افزوده ساخته شدند"
          : "ساخت در پس‌زمینه شروع شد؛ وضعیت همین‌جا به‌روز می‌شود",
      );
    },
    onError: (error: Error) => show(error.message, "failure"),
  });

  // Seconds, counted from the press. Only meaningful for the inline path, which
  // is the only one that keeps anybody waiting.
  //
  // The clock is state written by the interval and the figure is derived from
  // it, rather than the figure being state the effect resets. Resetting it in
  // the effect body is a synchronous setState inside an effect — a cascading
  // render, and the lint rule that catches it is right: `pending` already says
  // whether there is anything to count.
  const pending = generate.isPending;
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);
  // Clamped: the first render after the press still holds the previous tick, so
  // the subtraction is briefly negative.
  const elapsed = pending ? Math.max(0, Math.floor((nowMs - startedAt) / 1000)) : 0;

  const image = primaryImage(carpet.data?.images);
  const source = mediaUrl(image?.full_url ?? image?.url);
  const variants = ar.data ?? [];
  const readyCount = variants.filter((v) => v.ar_status === "ready").length;

  if (carpet.isPending) {
    return <div className="glass h-96 animate-pulse rounded-xl" aria-hidden />;
  }

  if (carpet.error) {
    return (
      <div className="glass rounded-xl px-5 py-14 text-center shadow-panel">
        <p className="text-sm leading-loose">{carpet.error.message}</p>
        <BackLink />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackLink />
          <h1 className="mt-1 text-[22px] leading-tight">{carpet.data?.name}</h1>
        </div>
        <p className="text-[13px] text-muted">
          {variants.length > 0
            ? `${formatNumber(readyCount)} از ${formatNumber(variants.length)} سایز آماده`
            : "بدون سایز"}
        </p>
      </div>

      {variants.length === 0 && !ar.isPending && (
        <Notice tone="warning">
          این فرش هنوز سایزی ندارد و فایل واقعیت افزوده برایش ساخته نمی‌شود.{" "}
          <Link
            href={`/admin/carpets/${carpetId}`}
            className="text-accent underline underline-offset-4"
          >
            افزودن سایز
          </Link>
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Rise className="relative">
          <section className="glass relative rounded-xl p-5 shadow-panel">
            <GoldRule />
            <h2 className="text-[15px]">گوشه‌های فرش</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              دستگیره‌ها را روی چهار گوشه‌ی خود فرش بگذارید. با کلیدهای جهت هم جابه‌جا
              می‌شوند و با نگه‌داشتن Shift گام بزرگ‌تر می‌شود.
            </p>

            {corners.isPending ? (
              <div className="mt-4 aspect-[3/2] animate-pulse rounded-lg bg-white/[0.04]" aria-hidden />
            ) : corners.error ? (
              <div className="mt-4">
                <Notice tone="warning">
                  {corners.error.message}{" "}
                  <Link
                    href={`/admin/carpets/${carpetId}`}
                    className="text-accent underline underline-offset-4"
                  >
                    مدیریت عکس‌ها
                  </Link>
                </Notice>
              </div>
            ) : draft && corners.data && source ? (
              <>
                {corners.data.needs_review && (
                  <div className="mt-4">
                    <Notice tone="warning">
                      تشخیص خودکار مطمئن نبود (اطمینان{" "}
                      {formatNumber(Math.round(corners.data.confidence * 100))}٪). گوشه‌ها را
                      خودتان بررسی کنید.
                    </Notice>
                  </div>
                )}

                <CornerEditor
                  className="mt-4"
                  src={source}
                  imageWidth={corners.data.image_width}
                  imageHeight={corners.data.image_height}
                  corners={draft}
                  onChange={setDraft}
                  disabled={pending}
                />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || variants.length === 0}
                    onClick={() => generate.mutate(draft)}
                    className="flex h-11 items-center gap-2 rounded-full bg-cta px-5 text-[13.5px] text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover disabled:opacity-50"
                  >
                    <Cuboid className="size-4" strokeWidth={1.75} />
                    ساخت با این گوشه‌ها
                  </button>

                  <button
                    type="button"
                    disabled={pending || !detected}
                    onClick={() => setDraft(detected!.map((c) => ({ ...c })))}
                    className="flex h-11 items-center gap-2 rounded-full border border-line-2 px-5 text-[13.5px] transition-colors duration-[--dur-feedback] hover:border-line disabled:opacity-40"
                  >
                    <RotateCcw className="size-4" strokeWidth={1.75} />
                    بازگرداندن گوشه‌های تشخیص‌داده‌شده
                  </button>
                </div>

                {pending && (
                  // Honest, not a spinner: what is being built, and how long it
                  // has taken so far. The pipeline writes two files per size.
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-3 text-[13px] leading-relaxed text-status-waiting"
                  >
                    در حال ساخت فایل‌ها برای {formatNumber(variants.length)} سایز… (
                    {formatNumber(elapsed)} ثانیه) این کار برای هر سایز یک فایل
                    اندروید و یک فایل آیفون می‌سازد و ممکن است ده‌ها ثانیه طول بکشد.
                  </p>
                )}
              </>
            ) : null}
          </section>
        </Rise>

        <Rise index={1} className="relative">
          <section className="glass relative rounded-xl p-5 shadow-panel">
            <GoldRule delay={0.1} />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px]">وضعیت هر سایز</h2>
              <button
                type="button"
                disabled={pending || variants.length === 0}
                onClick={() => generate.mutate(undefined)}
                className="flex h-11 items-center gap-2 rounded-full border border-line-2 px-4 text-[13px] transition-colors duration-[--dur-feedback] hover:border-line disabled:opacity-40"
              >
                <RotateCcw className="size-4" strokeWidth={1.75} />
                تشخیص خودکار دوباره
              </button>
            </div>

            {ar.isPending ? (
              <div className="mt-4 h-48 animate-pulse rounded-lg bg-white/[0.04]" aria-hidden />
            ) : ar.error ? (
              <p className="mt-4 text-[13px] leading-loose">{ar.error.message}</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-line">
                {variants.map((variant) => (
                  <VariantRow key={variant.variant_id} variant={variant} />
                ))}
              </ul>
            )}
          </section>
        </Rise>
      </div>
    </div>
  );
}

function VariantRow({ variant }: { variant: ArVariantStatus }) {
  const glb = mediaUrl(variant.glb_url);
  const usdz = mediaUrl(variant.usdz_url);

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13.5px]">
          {formatSize(variant.width_cm, variant.length_cm)}
        </span>
        <StatusPill status={variant.ar_status} />
      </div>

      {(glb || usdz) && (
        <div className="flex flex-wrap gap-3 text-[12.5px]">
          {glb && (
            <a
              href={glb}
              className="inline-flex min-h-11 items-center gap-1.5 text-accent underline-offset-4 hover:underline"
            >
              <Check className="size-3.5" strokeWidth={2} aria-hidden />
              فایل اندروید (glb)
            </a>
          )}
          {usdz && (
            <a
              href={usdz}
              className="inline-flex min-h-11 items-center gap-1.5 text-accent underline-offset-4 hover:underline"
            >
              <Check className="size-3.5" strokeWidth={2} aria-hidden />
              فایل آیفون (usdz)
            </a>
          )}
        </div>
      )}

      {variant.ar_error && (
        <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-status-cancelled">
          <X className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          {variant.ar_error}
        </p>
      )}
    </li>
  );
}

function Notice({ tone, children }: { tone: "warning"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3 text-[13px] leading-relaxed",
        tone === "warning" && "border-status-waiting/35 bg-status-waiting/10 text-ink",
      )}
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-status-waiting"
        strokeWidth={1.5}
        aria-hidden
      />
      <span>{children}</span>
    </p>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/ar"
      className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
    >
      <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
      بازگشت به فهرست
    </Link>
  );
}
