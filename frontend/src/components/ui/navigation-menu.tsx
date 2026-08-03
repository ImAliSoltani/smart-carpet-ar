"use client";

/**
 * Navigation menu primitives.
 *
 * From the shadcn registry that ships with 21st.dev's shop navigation menu,
 * adapted rather than kept as-is:
 *
 * - The chevron comes from lucide, which the project already carries, instead
 *   of pulling in `@radix-ui/react-icons` for one glyph.
 * - Physical margins and offsets become logical ones, because the site is RTL
 *   and `ml-1` puts the chevron on the wrong side of the word.
 * - The registry's open/close animation is written in `tailwindcss-animate`
 *   classes. Adding that plugin would put a second motion vocabulary beside
 *   the one the design system already defines, so the animation is expressed
 *   with the project's own duration and easing tokens instead (globals.css,
 *   `toranjan-menu-*`).
 */

import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { ChevronDown } from "lucide-react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

function NavigationMenu({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root>) {
  return (
    <NavigationMenuPrimitive.Root
      className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
      {...props}
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

const NavigationMenuItem = NavigationMenuPrimitive.Item;

/**
 * A menu entry reads as text, not as a control: the gallery direction asks the
 * interface to recede, so the resting state has no surface at all and the
 * underline is what answers the pointer — the same gesture the rest of the
 * site uses for links.
 */
const navigationMenuTriggerStyle = cva(
  "group relative inline-flex h-9 w-max items-center justify-center px-1 py-2 text-sm text-ink-2 " +
    "transition-colors duration-[--dur-feedback] hover:text-ink focus-visible:text-ink " +
    "disabled:pointer-events-none disabled:opacity-50 data-[state=open]:text-ink",
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      className={cn(navigationMenuTriggerStyle(), "gap-1.5", className)}
      {...props}
    >
      {children}
      <ChevronDown
        className="size-3.5 transition-transform duration-[--dur-feedback] group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      className={cn("start-0 top-0 w-full md:absolute md:w-auto", className)}
      {...props}
    />
  );
}

const NavigationMenuLink = NavigationMenuPrimitive.Link;

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className="absolute start-0 top-full flex justify-center">
      <NavigationMenuPrimitive.Viewport
        className={cn(
          "toranjan-menu-viewport relative mt-3 h-[var(--radix-navigation-menu-viewport-height)]",
          "w-full origin-top overflow-hidden border border-line bg-paper",
          "shadow-[0_30px_60px_-40px_rgba(24,24,27,0.45)]",
          "md:w-[var(--radix-navigation-menu-viewport-width)]",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuViewport,
};
