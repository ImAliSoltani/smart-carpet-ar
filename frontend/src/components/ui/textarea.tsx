/**
 * Textarea — the registry primitive from the same multistep form as
 * [ui/input](./input.tsx), and it carries the same two corrections: a base
 * font size so iOS does not zoom the page on focus, and our own tokens rather
 * than the registry's.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[104px] w-full rounded-md border border-line-2 bg-paper px-3.5 py-3 text-base",
        "leading-loose placeholder:text-muted",
        "transition-colors duration-[--dur-feedback]",
        "focus-visible:border-ink focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
