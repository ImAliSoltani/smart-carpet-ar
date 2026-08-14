"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ImageIcon, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/components/ui/file-dropzone-utils/use-file-upload";
import { cn } from "@/lib/utils";

/**
 * A place to put a photograph.
 *
 * 21st.dev's file dropzone, edited into this shop. What the catalogue component
 * brought and kept: the drop area with its focus ring, the single-file preview
 * filling the frame, the corner remove button, and the error line with its
 * `role="alert"`.
 *
 * What changed, and why:
 *
 * - **Multi-file is gone.** The one caller asks «کدام فرش شبیه این است», and
 *   that question takes one photograph. A `multiple` prop kept for symmetry
 *   would be a branch nothing exercises and nothing tests.
 * - **The dashed hairline became this shop's.** `border-input` and `bg-accent`
 *   are registry names that land wrong in our palette — `accent` is the gold,
 *   and the gold is for small marks, so an accented *surface* would make the
 *   page's largest element gold. The drag state tints the paper and moves the
 *   hairline to gold instead, which is the mark-sized use.
 * - **It is the thing the page is about, so it gets `shadow-raised`** — the
 *   token whose whole definition is "used once per screen".
 * - **Every dimension is logical.** `end-4` rather than `right-4`, so the remove
 *   button sits in the corner nearest the reader in both directions.
 *
 * Motion, to the shop's scale rather than the registry's: the frame settles
 * under a dragged file, the preview arrives instead of appearing, and the
 * button presses. All of it goes through `useReducedMotion` because framer
 * writes inline styles that the stylesheet's reduced-motion block cannot reach.
 */

export interface FileDropzoneProps {
  /** Comma-separated, as the `accept` attribute writes it. */
  accept?: string;
  maxSizeMB?: number;
  /** Called with the chosen file. Errors are the caller's to show. */
  onUpload?: (file: File) => Promise<unknown> | void;
  /** The caller is working on the last file; the zone waits rather than lies. */
  isBusy?: boolean;
  /** Under the button, where a hint belongs — never as a placeholder. */
  hint?: React.ReactNode;
  className?: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function FileDropzone({
  accept = "image/jpeg,image/png,image/webp",
  maxSizeMB = 8,
  onUpload,
  isBusy = false,
  hint,
  className,
}: FileDropzoneProps) {
  const reduced = useReducedMotion();
  const {
    files,
    isDragging,
    errors,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    removeFile,
    getInputProps,
  } = useFileUpload({
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles: 1,
    onUpload,
  });

  const chosen = files[0];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <motion.div
        className="relative"
        animate={reduced ? undefined : { scale: isDragging ? 1.01 : 1 }}
        transition={{ duration: 0.32, ease: EASE }}
      >
        <div
          // `has-[input:focus-visible]`, not `has-[input:focus]`: the input is
          // focused programmatically by the button, and a ring that appears on
          // a mouse click reads as an error state rather than as focus.
          className={cn(
            "relative flex min-h-72 flex-col items-center justify-center overflow-hidden",
            "rounded-lg border border-dashed bg-paper p-6 shadow-raised",
            "transition-colors duration-[--dur-feedback]",
            "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-accent/60",
            isDragging ? "border-accent bg-confirm-tint" : "border-line-2",
          )}
          data-dragging={isDragging || undefined}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input {...getInputProps()} aria-label="انتخاب عکس فرش" className="sr-only" />

          <AnimatePresence mode="wait" initial={false}>
            {chosen?.preview ? (
              <motion.div
                key="preview"
                className="absolute inset-0 flex items-center justify-center p-6"
                initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.36, ease: EASE }}
              >
                {/* A blob URL from the visitor's own device: `next/image` would
                    route it through the optimiser, which cannot fetch it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={chosen.preview}
                  alt={chosen.file.name}
                  className="max-h-64 rounded-md object-contain shadow-panel"
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center text-center"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.36, ease: EASE }}
              >
                <motion.span
                  aria-hidden="true"
                  className="mb-4 flex size-14 items-center justify-center rounded-full border border-line bg-bg shadow-panel"
                  animate={reduced ? undefined : { y: isDragging ? -4 : 0 }}
                  transition={{ duration: 0.32, ease: EASE }}
                >
                  <ImageIcon className="size-5 text-accent" />
                </motion.span>

                {/* Prose is formal plural, matching every other page; only the
                    error lines are familiar, matching `api/client.ts`. */}
                <p className="text-base">عکس فرش را اینجا رها کنید</p>
                <p className="mt-2 text-sm leading-loose text-muted">
                  یا از دستگاه خودتان انتخاب کنید — JPEG، PNG یا WebP
                </p>

                <Button
                  type="button"
                  onClick={openFileDialog}
                  disabled={isBusy}
                  // `h-11` for the §3-5 touch floor, and a shadow that deepens
                  // on hover and flattens on press — the button behaves like
                  // something being pushed rather than recoloured.
                  className={cn(
                    "mt-6 h-11 gap-2 rounded-full px-6",
                    "shadow-panel transition-all duration-[--dur-feedback]",
                    "hover:-translate-y-px hover:shadow-raised",
                    "active:translate-y-0 active:scale-[0.98] active:shadow-none",
                    "motion-reduce:transform-none motion-reduce:transition-none",
                  )}
                >
                  {isBusy ? (
                    <Loader2 className="size-[18px] animate-spin" />
                  ) : (
                    <Upload className="size-[18px]" />
                  )}
                  انتخاب عکس
                </Button>

                {hint}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {chosen && (
          <button
            type="button"
            aria-label="برداشتن عکس"
            onClick={() => removeFile(chosen.id)}
            className={cn(
              "absolute top-4 end-4 z-10 flex size-11 items-center justify-center rounded-full",
              "bg-paper text-ink shadow-panel outline-none",
              "transition-all duration-[--dur-feedback]",
              "hover:shadow-raised active:scale-95",
              "focus-visible:ring-2 focus-visible:ring-accent/60",
              "motion-reduce:transform-none motion-reduce:transition-none",
            )}
          >
            <X className="size-4" />
          </button>
        )}
      </motion.div>

      {/* `role="alert"` so a screen reader is told, rather than a red line
          appearing where only a sighted visitor would find it. */}
      {errors.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errors[0]}</span>
        </p>
      )}
    </div>
  );
}

export default FileDropzone;
