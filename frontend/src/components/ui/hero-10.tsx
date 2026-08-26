"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { Cta, type CtaProps } from "@/components/ui/hero-10-utils/cta";

/**
 * Centered Hero with Image Fan — [felipemenezes098/hero-10](https://21st.dev/@felipemenezes098/components/hero-10).
 *
 * A centred headline with one highlighted phrase, two actions, and three
 * photographs fanned out below like a hand of cards. Its structure, its slot
 * geometry and its staggered entrance are kept.
 *
 * What changed:
 *
 * - **The fan is mirrored for RTL, and it had to be.** The slots used `-mr-8`
 *   and `-ml-8` to pull the outer cards under the middle one. In an RTL flex
 *   row the children lay out right to left, so those physical margins pull the
 *   outer cards *away* from the overlap instead of into it, and the rotations
 *   splay the fan inward rather than outward. The margins are now logical and
 *   the rotations are negated, which restores the gesture the component was
 *   picked for. This is the same class of bug the repo already recorded for
 *   `translate` and for `slide-in-from-left/right`.
 * - **`motion/react` → `framer-motion`**, the name this repo already depends
 *   on. A second copy under the new name would ship two animation runtimes.
 * - **`react-wrap-balancer` is gone** — it does what `text-wrap: balance` now
 *   does natively, and the component already carries `text-balance`.
 * - **Raw `<img>` → `next/image`.** These are the largest images on the site's
 *   front page; §3-5 asks for optimized, multi-size sources.
 * - **`text-primary` on the highlighted phrase becomes the gold.** A few words
 *   inside a heading is exactly the «small mark» that accent is reserved for,
 *   and at 4.72:1 on this ground it is legible as text rather than decoration.
 */

export interface Hero10Props {
  title: string;
  /**
   * Which heading this title is. `h1` while the component *is* the top of a
   * page; `h2` once something else is — a page has one first heading, and a
   * second `h1` halfway down it is a document with two beginnings.
   */
  titleAs?: "h1" | "h2";
  titleLine2Prefix?: string;
  titleHighlight?: string;
  description: string;
  socialProof?: string;
  images: (string | StaticImageData)[];
  imageAlts?: string[];
  animation?: "none" | "subtle";
  primaryCTA: CtaProps;
  secondaryCTA?: CtaProps;
  variant?: "standard" | "compact";
}

const variantStyles = {
  standard: {
    section: "py-20 sm:py-28",
    title: "text-4xl sm:text-5xl md:text-6xl",
    description: "max-w-lg text-sm sm:text-base",
    header: "gap-5",
    content: "gap-8 sm:gap-10",
    fan: "max-w-3xl",
    fanCard: "aspect-4/5",
  },
  compact: {
    section: "py-14 sm:py-20",
    title: "text-2xl sm:text-3xl md:text-4xl",
    description: "max-w-md text-sm",
    header: "gap-4",
    content: "gap-6 sm:gap-8",
    fan: "max-w-2xl",
    fanCard: "aspect-4/5",
  },
} as const;

/**
 * Three slots, mirrored from the component's own.
 *
 * `-me-8`/`-ms-8` rather than `-mr-8`/`-ml-8`: the negative margin has to point
 * at the *next* card in reading order for the cards to overlap, and in RTL that
 * is the other physical side. The rotations and entrance offsets are negated
 * with them, so the outer cards still tilt away from the middle.
 */
const fanSlots = [
  { width: "w-[38%]", layout: "-me-8 z-10", rotate: 6, x: -48, ty: 24 },
  { width: "w-[42%]", layout: "z-20", rotate: 0, x: 0, ty: -8 },
  { width: "w-[38%]", layout: "-ms-8 z-10", rotate: -6, x: 48, ty: 24 },
];

const fanContainer: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.4,
      delayChildren: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const fanCard: Variants = {
  hidden: (slot: (typeof fanSlots)[number]) => ({
    x: slot.x,
    rotate: slot.rotate,
    y: slot.ty,
  }),
  visible: (slot: (typeof fanSlots)[number]) => ({
    x: 0,
    rotate: slot.rotate,
    y: slot.ty,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

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
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
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

function ImageFan({
  images,
  imageAlts,
  cardAspect,
  animate,
}: Readonly<{
  images: (string | StaticImageData)[];
  imageAlts?: string[];
  cardAspect: string;
  animate: boolean;
}>) {
  return (
    <motion.div
      className="relative flex w-full items-center justify-center"
      variants={fanContainer}
      initial={animate ? "hidden" : false}
      whileInView={animate ? "visible" : undefined}
      animate={animate ? undefined : "visible"}
      viewport={{ once: true, margin: "-80px" }}
    >
      {images.slice(0, 3).map((src, i) => {
        const slot = fanSlots[i] ?? fanSlots[1];
        return (
          <motion.div
            key={typeof src === "string" ? src : src.src}
            custom={slot}
            variants={fanCard}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-xl bg-bg shadow-raised outline outline-ink/10",
              cardAspect,
              slot.width,
              slot.layout,
            )}
          >
            <Image
              src={src}
              alt={imageAlts?.[i] ?? ""}
              fill
              sizes="(min-width: 1024px) 30vw, 40vw"
              // Only the middle card is likely above the fold on a phone; the
              // other two are one scroll away and can wait their turn.
              priority={i === 1}
              className="object-cover"
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function Hero10({
  title,
  titleAs: Title = "h1",
  titleLine2Prefix,
  titleHighlight,
  description,
  socialProof,
  images,
  imageAlts,
  animation = "subtle",
  primaryCTA,
  secondaryCTA,
  variant = "standard",
}: Readonly<Hero10Props>) {
  const reduce = useReducedMotion();
  const animate = animation === "subtle" && !reduce;
  const vs = variantStyles[variant];

  return (
    <section className="relative isolate w-full overflow-hidden bg-bg">
      <motion.div
        className={cn(
          "relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 text-center",
          vs.section,
          vs.content,
        )}
        variants={animate ? container : undefined}
        initial={animate ? "hidden" : false}
        whileInView={animate ? "visible" : undefined}
        viewport={{ once: true, margin: "-80px" }}
      >
        <Reveal
          active={animate}
          className={cn("flex w-full max-w-2xl flex-col items-center", vs.header)}
        >
          {/* The shop's one sentence. Bold and large enough to be that. */}
          <Title className={cn("font-bold leading-[1.3] tracking-tight text-balance text-ink", vs.title)}>
            {title}
            {(titleLine2Prefix || titleHighlight) && (
              <>
                <br />
                {titleLine2Prefix && <span>{titleLine2Prefix} </span>}
                {titleHighlight && <span className="text-accent">{titleHighlight}</span>}
              </>
            )}
          </Title>

          {description && (
            <p className={cn("leading-loose text-balance text-muted", vs.description)}>
              {description}
            </p>
          )}
        </Reveal>

        <Reveal active={animate} className="flex flex-col items-center gap-4">
          {(primaryCTA?.ctaEnabled || secondaryCTA?.ctaEnabled) && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
              {primaryCTA?.ctaEnabled && <Cta cta={primaryCTA} />}
              {secondaryCTA?.ctaEnabled && (
                <Cta cta={{ ...secondaryCTA, variant: secondaryCTA.variant ?? "outline" }} />
              )}
            </div>
          )}
          {socialProof && <p className="text-xs text-muted">{socialProof}</p>}
        </Reveal>

        {images?.length ? (
          <div className={cn("mx-auto w-full", vs.fan)}>
            <ImageFan
              images={images}
              imageAlts={imageAlts}
              cardAspect={vs.fanCard}
              animate={animate}
            />
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}

export default Hero10;
