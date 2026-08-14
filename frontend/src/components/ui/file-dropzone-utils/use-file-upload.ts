"use client";

import * as React from "react";

/**
 * The machinery behind `ui/file-dropzone.tsx`.
 *
 * The registry answer for that component imported this hook and did not ship
 * it, the same way `hero-10` was missing its `cta` — so it is written here, to
 * the contract the component already expects. Written to *our* needs while we
 * are at it: one image, validated before it leaves the device, and messages in
 * Persian because they reach the screen.
 *
 * Two things the original did not do, both of which matter here:
 *
 * - **The preview URL is revoked.** `URL.createObjectURL` pins the whole file
 *   in memory until it is released, and a shopper trying six photographs of
 *   their living room would pin six of them for the life of the tab.
 * - **Validation runs before the upload.** The backend checks size and format
 *   too and must keep doing so, but a photo rejected here never leaves the
 *   phone — which on a mobile connection is the difference between a message
 *   now and a message after ten seconds of uploading a file that was never
 *   going to be accepted.
 */

export interface FileWithPreview {
  id: string;
  file: File;
  /** An object URL, or null for files that cannot be shown. */
  preview: string | null;
}

export interface UseFileUploadOptions {
  /** Comma-separated, as the `accept` attribute writes it. */
  accept?: string;
  /** In bytes. */
  maxSize?: number;
  maxFiles?: number;
  onUpload?: (file: File) => Promise<unknown> | void;
}

function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  // Persian digits, to match every other number in the shop. Not `formatNumber`
  // from `lib/format`: this is a decimal and that helper is for whole numbers.
  return `${mb.toFixed(mb < 1 ? 1 : 0)}`.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** Does this file match an `accept` list — `image/*`, `.png`, `image/webp`? */
function matchesAccept(file: File, accept: string): boolean {
  return accept
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => {
      if (entry.startsWith(".")) return file.name.toLowerCase().endsWith(entry);
      if (entry.endsWith("/*")) return file.type.startsWith(entry.slice(0, -1));
      return file.type.toLowerCase() === entry;
    });
}

export function useFileUpload({
  accept,
  maxSize,
  maxFiles = 1,
  onUpload,
}: UseFileUploadOptions = {}) {
  const [files, setFiles] = React.useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Drag events fire on every child the pointer crosses, so a plain boolean
  // flickers off the moment the cursor passes over the icon inside the zone.
  // Counting enters against leaves is what makes the highlight hold.
  const dragDepth = React.useRef(0);

  // Object URLs live until revoked. This releases whatever is on screen when
  // the component goes away; `setFiles` below releases what it replaces.
  React.useEffect(() => {
    return () => {
      for (const entry of files) {
        if (entry.preview) URL.revokeObjectURL(entry.preview);
      }
    };
    // Deliberately on unmount only — running it per change would revoke the
    // preview that is currently being shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = React.useCallback(
    (file: File): string | null => {
      if (accept && !matchesAccept(file, accept)) {
        return "این نوع فایل پشتیبانی نمی‌شود. یک عکس بفرست (JPEG، PNG یا WebP).";
      }
      if (maxSize && file.size > maxSize) {
        return `حجم عکس بیشتر از ${formatSize(maxSize)} مگابایت است.`;
      }
      return null;
    },
    [accept, maxSize],
  );

  const addFiles = React.useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming).slice(0, maxFiles);
      const rejected: string[] = [];
      const accepted: FileWithPreview[] = [];

      for (const file of list) {
        const problem = validate(file);
        if (problem) {
          rejected.push(problem);
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          file,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        });
      }

      setErrors(rejected);
      if (accepted.length === 0) return;

      setFiles((previous) => {
        // Single-file mode replaces rather than appends, so the previous
        // preview is no longer reachable and has to be released here.
        const kept = maxFiles === 1 ? [] : previous;
        for (const entry of previous) {
          if (!kept.includes(entry) && entry.preview) URL.revokeObjectURL(entry.preview);
        }
        return [...kept, ...accepted].slice(0, maxFiles);
      });

      if (onUpload) void onUpload(accepted[0].file);
    },
    [maxFiles, onUpload, validate],
  );

  const removeFile = React.useCallback((id: string | undefined) => {
    if (!id) return;
    setFiles((previous) => {
      const going = previous.find((entry) => entry.id === id);
      if (going?.preview) URL.revokeObjectURL(going.preview);
      return previous.filter((entry) => entry.id !== id);
    });
    setErrors([]);
  }, []);

  const handleDragEnter = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = React.useCallback((event: React.DragEvent) => {
    // Without this the browser navigates to the dropped file and the page is
    // simply gone — the default action for a drop is "open this".
    event.preventDefault();
  }, []);

  const handleDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
    },
    [addFiles],
  );

  const openFileDialog = React.useCallback(() => inputRef.current?.click(), []);

  const getInputProps = React.useCallback(
    () => ({
      ref: inputRef,
      type: "file" as const,
      accept,
      multiple: maxFiles > 1,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) addFiles(event.target.files);
        // Cleared so that choosing the same file twice in a row still fires a
        // change event — otherwise a shopper who removed a photo cannot pick it
        // again without picking something else first.
        event.target.value = "";
      },
    }),
    [accept, addFiles, maxFiles],
  );

  return {
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
  };
}
