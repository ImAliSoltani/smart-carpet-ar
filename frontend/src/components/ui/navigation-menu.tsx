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
 * A menu entry at rest is only text — the gallery direction asks the interface
 * to recede. What answers the pointer is movement: a rule that draws itself in
 * from the trailing edge, the same gesture every other link on the site uses,
 * over a surface that fades up underneath it. Both stay put while the entry's
 * panel is open, so the bar always says which panel you are looking at.
 *
 * The entry is 44px tall, not the registry's 36px. The bar only renders from
 * `lg` up, but that breakpoint still catches touchscreen laptops and tablets
 * held in landscape, where 36px is under the target the roadmap asks for
 * (§3-5); it is also the height the header's icon buttons already are, so the
 * row reads as one set of targets rather than two. The rule underneath is
 * offset against that height so that it sits just under the text — the two are
 * one measurement, and changing the height without the offset lifts the rule
 * off the word by half the difference.
 */
const navigationMenuTriggerStyle = cva(
  "group relative inline-flex h-11 w-max items-center justify-center rounded-md px-4 py-2 text-sm text-ink-2 " +
    "transition-[color,background-color] duration-[--dur-feedback] ease-[cubic-bezier(.65,0,.35,1)] " +
    "hover:bg-paper hover:text-ink focus-visible:text-ink " +
    "data-[state=open]:bg-paper data-[state=open]:text-ink " +
    "after:absolute after:inset-x-4 after:bottom-2 after:h-px after:origin-right after:scale-x-0 after:bg-ink " +
    "after:transition-transform after:duration-[450ms] after:ease-[cubic-bezier(.16,1,.3,1)] " +
    "hover:after:scale-x-100 data-[state=open]:after:scale-x-100 " +
    "disabled:pointer-events-none disabled:opacity-50",
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
        className="size-3.5 transition-transform duration-[350ms] ease-[cubic-bezier(.16,1,.3,1)] group-data-[state=open]:rotate-180"
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
      className={cn("toranjan-menu-content start-0 top-0 w-full md:absolute md:w-auto", className)}
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
          "toranjan-menu-viewport relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)]",
          // Rounded and softly raised, as the catalogue component is. Squaring
          // it off was a reading of the design system applied over the top of a
          // component that had already answered the question.
          "w-full origin-top overflow-hidden rounded-md border border-line bg-paper",
          "shadow-raised",
          "md:w-[var(--radix-navigation-menu-viewport-width)]",
          className,
        )}
        /* Nothing may be passed as `style` here. Radix publishes the measured
           panel size as inline custom properties on this very element, and the
           primitive spreads incoming props after its own — so a style object,
           even a one-line one, replaces the attribute and takes the size
           variables with it. The frame then collapses to its border while the
           panel renders at full size behind `overflow-hidden`, which looks
           exactly like a menu that does not open. */
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
