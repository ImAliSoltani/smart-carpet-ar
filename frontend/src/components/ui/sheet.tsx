"use client";

/**
 * Sheet — the sliding panel behind the mobile menu.
 *
 * From the same registry bundle as the navigation menu, trimmed and adapted:
 *
 * - The registry's `left`/`right` sides are physical, which is the wrong axis
 *   for an RTL site. A drawer here opens from the edge the thumb starts at, so
 *   the sides are logical (`start`/`end`) and follow the document direction.
 * - Motion uses the project's tokens rather than the `tailwindcss-animate`
 *   classes the registry assumes; the keyframes live in globals.css.
 * - Header, footer and description subcomponents are dropped — nothing needs
 *   them yet, and an unused export is a thing to keep in step for no reason.
 */

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "start",
  title,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "start" | "end";
  /** Announced to screen readers; Radix requires a title on every dialog. */
  title: string;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="toranjan-sheet-overlay fixed inset-0 z-50 bg-ink/35" />
      <SheetPrimitive.Content
        className={cn(
          "toranjan-sheet fixed inset-y-0 z-50 flex h-full w-[86%] max-w-sm flex-col",
          "bg-paper p-6 shadow-[0_0_80px_-20px_rgba(24,24,27,0.5)]",
          side === "start" ? "start-0 border-e border-line" : "end-0 border-s border-line",
          className,
        )}
        data-side={side}
        {...props}
      >
        <SheetPrimitive.Title className="sr-only">{title}</SheetPrimitive.Title>
        {children}
        <SheetPrimitive.Close
          className="absolute top-5 end-5 grid size-11 place-items-center rounded-full text-muted transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink"
          aria-label="بستن"
        >
          <X className="size-5" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
