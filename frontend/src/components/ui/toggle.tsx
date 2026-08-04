"use client";

/**
 * Toggle — a button that stays pressed.
 *
 * The registry primitive behind
 * [cnippet.dev/v-toggle-10](https://21st.dev/@cnippet.dev/components/v-toggle-10),
 * the filter chips. Structure and variants are its own.
 *
 * One change that matters: the registry presses a chip by painting it
 * `bg-accent`. In shadcn's vocabulary that is a neutral hover surface, but our
 * token map points `--color-accent` at the gold, and gold in this palette is
 * reserved for small marks — a row of pressed chips would turn it into the
 * page's dominant colour. A pressed chip takes the charcoal action surface
 * instead, which is what «selected» looks like everywhere else here.
 */

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors " +
    "duration-[--dur-feedback] hover:bg-bg focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none " +
    "disabled:opacity-50 data-[state=on]:bg-cta data-[state=on]:text-on-cta",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-line-2 bg-transparent hover:bg-bg",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-3",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
