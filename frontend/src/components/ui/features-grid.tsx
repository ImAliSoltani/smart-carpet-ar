"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Features Grid — [gooseui/features-grid](https://21st.dev/@gooseui/components/features-grid).
 *
 * Its shape is kept: a centred heading over a responsive grid of cards, each
 * an icon chip above a title and a line of copy.
 *
 * What changed:
 *
 * - **A staggered entrance on scroll**, which the component did not have and
 *   which the visual direction needs — the layout is deliberately quiet and
 *   says outright that motion is what keeps it from going dry. Each card
 *   arrives after the one before it, in reading order, and `useReducedMotion`
 *   switches the whole thing off (framer-motion writes inline styles and does
 *   not obey the CSS block, a trap this repo has hit before).
 * - **The icon chip is gold, not `primary`.** In our token map `primary` is
 *   the charcoal action surface, which would make six grey squares. A small
 *   icon is exactly the mark the accent is reserved for.
 * - **`hover:bg-muted/50` had to go** — `muted` here is a text colour, so that
 *   class paints a card in body-copy grey. The hover moves the hairline
 *   instead, which is what every other surface in this palette does.
 * - **A card can be a link.** Each of these names something the shop can do,
 *   and a promise you cannot press is a poster.
 */

export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href?: string;
}

export interface FeaturesGridProps {
  title?: string;
  subtitle?: string;
  features: Feature[];
  className?: string;
}

function CardBody({ icon: Icon, title, description }: Feature) {
  return (
    <>
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-accent/10">
        <Icon className="size-6 text-accent" />
      </div>
      <h3 className="mb-2 text-[15px] font-bold tracking-tight">{title}</h3>
      <p className="text-[13.5px] leading-loose text-muted">{description}</p>
    </>
  );
}

export function FeaturesGrid({ title, subtitle, features, className }: FeaturesGridProps) {
  const reduced = useReducedMotion();
  const surface =
    "block h-full rounded-xl border border-line bg-paper p-6 shadow-panel transition-colors duration-[--dur-feedback] hover:border-line-2";

  return (
    <section className={cn("px-6 py-20 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && (
              // The page's argument, not a section label: it carries the most
              // weight on the screen and the size to match.
              <h2 className="text-3xl font-bold leading-[1.55] tracking-tight sm:text-4xl md:text-[2.75rem]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mx-auto mt-4 max-w-2xl leading-loose text-muted">{subtitle}</p>
            )}
          </div>
        )}

        {/* Four across, not three: there are exactly four promises and a
              row of three leaves one orphaned underneath. */}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.li
              key={feature.title}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: reduced ? 0 : 0.55,
                delay: reduced ? 0 : index * 0.09,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {feature.href ? (
                <Link href={feature.href} className={surface}>
                  <CardBody {...feature} />
                </Link>
              ) : (
                <div className={surface}>
                  <CardBody {...feature} />
                </div>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default FeaturesGrid;
