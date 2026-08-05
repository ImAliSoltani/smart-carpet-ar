import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The call to action of [hero-10](../hero-10.tsx), to the shape its parent
 * passes: `{ ctaEnabled, text, link, variant, size }`. Written here because
 * `hero-10-utils/cta` is the one file the registry's answer left out — the
 * rest of that hero, including its image fan, arrived whole.
 *
 * `link` is rendered as a `next/link`, since every destination this hero has
 * is inside the shop.
 */

export interface CtaProps {
  ctaEnabled?: boolean;
  text: string;
  link: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function Cta({ cta }: { cta: CtaProps }) {
  const { text, link, variant = "default", size = "lg", className } = cta;

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      // The registry's `lg` is 44px; ours needs to clear the touch floor with
      // the room a primary action on a hero deserves.
      className={cn("h-13 rounded-full px-8 text-[15px]", className)}
    >
      <Link href={link}>{text}</Link>
    </Button>
  );
}
