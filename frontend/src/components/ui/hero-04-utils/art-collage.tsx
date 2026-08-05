import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The two overlapping frames of [hero-04](../hero-04.tsx).
 *
 * Written here rather than fetched: the registry's answer for that hero
 * carried the parent only, and `hero-04-utils/art-collage` came back missing.
 * Its contract is fully stated by the parent — two images, a primary and a
 * secondary, laid over each other — so this is that contract, not a design
 * invented to fill a hole.
 *
 * Two things it does that a naive stack would not:
 *
 * - **The offset is inline-logical, not physical.** In an RTL page the small
 *   frame belongs on the side the eye reaches second. `start`/`end` follow the
 *   document; `left`/`right` would pin it to the wrong corner.
 * - **The tall frame reserves its box.** Both use `fill` inside a fixed aspect
 *   ratio, so the hero does not reflow when the photographs arrive — the
 *   layout-shift rule in §3-5 is hardest to keep exactly where the biggest
 *   image on the site lives.
 */

export interface ArtCollageProps {
  primaryImage: string;
  secondaryImage: string;
  primaryAlt?: string;
  secondaryAlt?: string;
  className?: string;
  /** The first screenful on the home page, so the wide frame is not lazy. */
  priority?: boolean;
}

export function ArtCollage({
  primaryImage,
  secondaryImage,
  primaryAlt = "",
  secondaryAlt = "",
  className,
  priority = false,
}: ArtCollageProps) {
  return (
    <div className={cn("relative w-full pb-16 sm:pb-20", className)}>
      <div className="relative aspect-4/5 w-full overflow-hidden rounded-xl border border-line bg-bg shadow-raised">
        <Image
          src={primaryImage}
          alt={primaryAlt}
          fill
          sizes="(min-width: 1024px) 42vw, 92vw"
          priority={priority}
          className="object-cover"
        />
      </div>

      {/* Sits over the corner of the wide frame and past its edge, which is
          what makes it a collage rather than two pictures in a column. */}
      <div className="absolute bottom-0 end-4 aspect-square w-[42%] max-w-56 overflow-hidden rounded-xl border border-line bg-bg shadow-raised sm:end-8">
        <Image
          src={secondaryImage}
          alt={secondaryAlt}
          fill
          sizes="(min-width: 1024px) 18vw, 40vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
