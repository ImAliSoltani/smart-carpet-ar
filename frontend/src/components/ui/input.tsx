/**
 * Input — the registry primitive that came with
 * [arihantcodes/multistep-form](https://21st.dev/@arihantcodes_1f7b8c4d/components/multistep-form).
 *
 * Two changes, both from ROADMAP §3-5:
 *
 * - **`h-12`, not `h-10`.** Forty pixels is under the touch-target floor, and
 *   a checkout is the one screen where a mis-tap costs the sale.
 * - **`text-base`, not `text-sm`.** iOS Safari zooms the page in on focus when
 *   a field's text is under 16px, and the zoom does not undo itself — the
 *   shopper is left on a page wider than the screen for the rest of checkout.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-md border border-line-2 bg-paper px-3.5 py-2 text-base",
        "placeholder:text-muted",
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
