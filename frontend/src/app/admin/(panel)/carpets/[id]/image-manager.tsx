"use client";

import * as React from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Star, Trash2, Upload } from "lucide-react";

import { EASE_OUT, listStagger } from "@/components/toranjan/admin-motion";
import { adminKeys, deleteImage, updateImage, uploadImage } from "@/lib/api/admin";
import { ApiError, mediaUrl } from "@/lib/api/client";
import type { AdminCarpetDetail, ImageOut } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The photographs (ROADMAP §6-15: upload, ordering, and choosing the main one).
 *
 * **Ordering is arrows, not drag.** Dragging is the nicer gesture and it is the
 * wrong one to build alone: it is invisible to a keyboard, awkward on a phone,
 * and needs a library to be tolerable. Two buttons per photograph are reachable
 * by every input there is, and «move it one place» is what reordering four
 * pictures actually means. If drag arrives later it should arrive *beside*
 * these, never instead of them.
 *
 * The primary photograph is not decoration: it is the one the shop's grid shows
 * and the one the AR pipeline rectifies, so the star says both.
 */

function useImageActions(carpetId: number) {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.carpet(carpetId) });
    // The list's thumbnail and image count come from a different query.
    queryClient.invalidateQueries({ queryKey: ["admin", "carpets"] });
  };
  return { refresh };
}

function ImageCard({
  carpetId,
  image,
  index,
  count,
  onMove,
}: {
  carpetId: number;
  image: ImageOut;
  index: number;
  count: number;
  onMove: (image: ImageOut, direction: -1 | 1) => void;
}) {
  const reduced = useReducedMotion();
  const { refresh } = useImageActions(carpetId);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const makePrimary = useMutation({
    mutationFn: () => updateImage(image.id, { is_primary: true }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: () => deleteImage(image.id),
    onSuccess: refresh,
  });

  const src = mediaUrl(image.thumb_url ?? image.url);

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.42,
        ease: EASE_OUT,
        delay: reduced ? 0 : listStagger(index, count),
      }}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-white/[0.03]",
        image.is_primary ? "border-accent/50" : "border-line-2",
      )}
    >
      <span className="relative block aspect-square">
        {src && <Image src={src} alt="" fill sizes="160px" className="object-contain p-2" />}
      </span>

      {image.is_primary && (
        <span className="absolute top-2 end-2 flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-[11px] text-accent">
          <Star className="size-3 fill-accent" strokeWidth={0} aria-hidden />
          اصلی
        </span>
      )}

      <div className="flex items-center justify-between gap-1 border-t border-line p-1.5">
        <div className="flex">
          <button
            type="button"
            onClick={() => onMove(image, -1)}
            disabled={index === 0}
            aria-label="یک جا جلوتر"
            className="grid size-11 place-items-center rounded-md text-muted transition-colors duration-[--dur-feedback] hover:text-ink disabled:opacity-30"
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onMove(image, 1)}
            disabled={index === count - 1}
            aria-label="یک جا عقب‌تر"
            className="grid size-11 place-items-center rounded-md text-muted transition-colors duration-[--dur-feedback] hover:text-ink disabled:opacity-30"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex">
          {!image.is_primary && (
            <button
              type="button"
              onClick={() => makePrimary.mutate()}
              disabled={makePrimary.isPending}
              aria-label="عکس اصلی شود"
              className="grid size-11 place-items-center rounded-md text-muted transition-colors duration-[--dur-feedback] hover:text-accent disabled:opacity-50"
            >
              {makePrimary.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Star className="size-4" strokeWidth={1.5} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => (confirmDelete ? remove.mutate() : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            disabled={remove.isPending}
            aria-label={confirmDelete ? "تأیید حذف عکس" : "حذف عکس"}
            className={cn(
              "grid size-11 place-items-center rounded-md transition-colors duration-[--dur-feedback] disabled:opacity-50",
              confirmDelete
                ? "bg-status-cancelled/15 text-status-cancelled"
                : "text-muted hover:text-status-cancelled",
            )}
          >
            {remove.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
    </motion.li>
  );
}

export function ImageManager({ carpet }: { carpet: AdminCarpetDetail }) {
  const { refresh } = useImageActions(carpet.id);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);

  const ordered = [...carpet.images].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
  );

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      // Sequential, not `Promise.all`. Each upload builds four derivatives and
      // runs a DINOv2 embedding on the server; firing five at once at a local
      // machine makes all five slow and one of them time out.
      for (const [i, file] of files.entries()) {
        setProgress({ done: i, total: files.length });
        await uploadImage(carpet.id, file);
      }
    },
    onMutate: () => setFailure(null),
    onSettled: () => {
      setProgress(null);
      refresh();
    },
    onError: (error) =>
      setFailure(error instanceof ApiError ? error.message : "آپلود عکس انجام نشد."),
  });

  const reorder = useMutation({
    mutationFn: async ({ image, direction }: { image: ImageOut; direction: -1 | 1 }) => {
      const from = ordered.findIndex((i) => i.id === image.id);
      const to = from + direction;
      if (to < 0 || to >= ordered.length) return;
      // Both rows are written, because `position` is what the shop sorts on and
      // swapping one of a pair leaves two photographs claiming the same place.
      await updateImage(ordered[from].id, { position: to });
      await updateImage(ordered[to].id, { position: from });
    },
    onSuccess: refresh,
  });

  return (
    <div className="glass rounded-xl p-5 shadow-panel sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-medium">
          عکس‌ها
          <span className="ms-2 text-[13px] font-normal text-muted">
            {formatNumber(ordered.length)}
          </span>
        </h2>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="flex h-11 items-center gap-2 rounded-full border border-line-2 px-4 text-[13.5px] transition-colors duration-[--dur-feedback] hover:border-line disabled:opacity-60"
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" strokeWidth={1.5} />
          )}
          {upload.isPending && progress
            ? `${formatNumber(progress.done + 1)} از ${formatNumber(progress.total)}`
            : "افزودن عکس"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) upload.mutate(files);
            // Cleared so choosing the same file twice still fires `change`.
            e.target.value = "";
          }}
        />
      </div>

      <p className="mt-2 text-[13px] leading-loose text-muted">
        نخستین عکس، عکس اصلی می‌شود: هم در فروشگاه دیده می‌شود، هم پایپ‌لاین واقعیت افزوده
        روی همان کار می‌کند. نمای رو‌به‌رو و تخت بهترین نتیجه را می‌دهد.
      </p>

      {failure && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3.5 text-[13px] leading-loose"
        >
          {failure}
        </p>
      )}

      {ordered.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-line-2 px-4 py-10 text-center text-[13.5px] leading-loose text-muted">
          هنوز عکسی ندارد. بدون عکس، نه در فروشگاه دیده می‌شود و نه فایل AR می‌گیرد.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ordered.map((image, i) => (
            <ImageCard
              key={image.id}
              carpetId={carpet.id}
              image={image}
              index={i}
              count={ordered.length}
              onMove={(img, direction) => reorder.mutate({ image: img, direction })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
