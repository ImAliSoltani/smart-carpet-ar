"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { Cta, type CtaProps } from "@/components/ui/hero-04-utils/cta";
import { ArtCollage } from "@/components/ui/hero-04-utils/art-collage";

/**
 * Editorial Collage Hero — [felipemenezes098/hero-04](https://21st.dev/@felipemenezes098/components/hero-04).
 *
 * Two columns: a serif headline with copy and actions on one side, two
 * overlapping photographs on the other, over a soft blurred wash of the same
 * image. Its structure and its stagger are kept whole.
 *
 * What changed:
 *
 * - **`motion/react` → `framer-motion`.** Same library, and the repo already
 *   depends on the name it had when this was written; a second copy under the
 *   new name would ship two animation runtimes.
 * - **`react-wrap-balancer` is gone.** It exists to do what `text-wrap:
 *   balance` now does natively, and the component already carries Tailwind's
 *   `text-balance` on the same heading — the package would have been a
 *   dependency to duplicate a CSS property.
 * - **Its two missing children are written in this repo** — see
 *   [art-collage](./hero-04-utils/art-collage.tsx). The registry answered with
 *   the parent alone.
 * - **`animation` defaults to `subtle` here.** The visual direction is
 *   deliberately quiet and says outright that motion is what keeps it from
 *   going dry; a hero that arrives with no entrance is the case that rule was
 *   written about. `useReducedMotion` still switches it off entirely.
 */

export interface Hero04Props {
  title: string;
  titleLine2?: string;
  description: string;
  washImage?: string;
  primaryImage: string;
  secondaryImage: string;
  primaryAlt?: string;
  secondaryAlt?: string;
  animation?: "none" | "subtle";
  primaryCTA: CtaProps;
  secondaryCTA?: CtaProps;
  variant?: "standard" | "compact";
}

const variantStyles = {
  standard: {
    section: "py-20 sm:py-28",
    title: "text-3xl sm:text-4xl md:text-5xl",
    description: "max-w-md text-sm sm:text-base",
    header: "gap-5",
    grid: "gap-12 lg:gap-16",
  },
  compact: {
    section: "py-14 sm:py-20",
    title: "text-2xl sm:text-3xl md:text-4xl",
    description: "max-w-sm text-sm",
    header: "gap-4",
    grid: "gap-10 lg:gap-12",
  },
} as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    // 500ms — the entrance band of §3-5, and the component's own timing
    // already sat inside it.
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const mediaItem: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

function Reveal({
  active,
  variants,
  className,
  children,
}: Readonly<{
  active: boolean;
  variants?: Variants;
  className?: string;
  children: React.ReactNode;
}>) {
  if (!active) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={variants ?? item} className={className}>
      {children}
    </motion.div>
  );
}

export function Hero04({
  title,
  titleLine2,
  description,
  washImage,
  primaryImage,
  secondaryImage,
  primaryAlt = "",
  secondaryAlt = "",
  animation = "subtle",
  primaryCTA,
  secondaryCTA,
  variant = "standard",
}: Readonly<Hero04Props>) {
  const reduce = useReducedMotion();
  const animate = animation === "subtle" && !reduce;
  const vs = variantStyles[variant];

  return (
    <section className="relative isolate w-full overflow-hidden bg-bg">
      {washImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-40 blur-3xl"
        >
          {/* Decorative, so a plain `img`: it is drawn out of focus at a size
              nothing measures, and the optimizer would be re-encoding a blur. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={washImage} alt="" className="h-full w-full object-cover object-top" />
        </div>
      )}

      <motion.div
        className={cn(
          "relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center px-6 lg:grid-cols-2",
          vs.section,
          vs.grid,
        )}
        variants={animate ? container : undefined}
        initial={animate ? "hidden" : false}
        whileInView={animate ? "visible" : undefined}
        viewport={{ once: true, margin: "-80px" }}
      >
        <Reveal active={animate} className={cn("flex flex-col items-start", vs.header)}>
          <h1 className={cn("font-light tracking-tight text-balance text-ink", vs.title)}>
            {title}
            {titleLine2 && (
              <>
                <br />
                {titleLine2}
              </>
            )}
          </h1>

          {description && (
            <p className={cn("leading-loose text-balance text-muted", vs.description)}>
              {description}
            </p>
          )}

          {(primaryCTA?.ctaEnabled || secondaryCTA?.ctaEnabled) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3">
              {primaryCTA?.ctaEnabled && <Cta cta={primaryCTA} />}
              {secondaryCTA?.ctaEnabled && (
                <Cta cta={{ ...secondaryCTA, variant: secondaryCTA.variant ?? "outline" }} />
              )}
            </div>
          )}
        </Reveal>

        <Reveal active={animate} variants={mediaItem} className="w-full">
          <ArtCollage
            primaryImage={primaryImage}
            secondaryImage={secondaryImage}
            primaryAlt={primaryAlt}
            secondaryAlt={secondaryAlt}
            priority
          />
        </Reveal>
      </motion.div>
    </section>
  );
}

export default Hero04;
