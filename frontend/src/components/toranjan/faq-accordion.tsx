"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { useAccordion, useAutoHeight } from "@/components/ui/accordion";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The questions page's accordion.
 *
 * Two components met here. The machinery is the one this repo already had —
 * `useAccordion` and `useAutoHeight` from `ui/accordion.tsx`, which carry the
 * roving arrow-key focus, the `aria-expanded`/`aria-controls` pairing, the
 * `role="region"` panel and the `inert` that keeps a closed panel out of the
 * tab order. None of that is worth writing a second time, and a second
 * implementation is a second thing to keep correct.
 *
 * The dress is from [jatin-yadav05/interactive-accordion](https://21st.dev/@jatin-yadav05/components/interactive-accordion):
 * a numbered marker, a plus that turns into a cross, and a rule that draws
 * itself along the row. The filter panel's accordion is a compact control
 * inside a bordered box; this one is the page. So the box is gone and the rows
 * sit on the ground with hairlines between them, which is what the gallery
 * direction asks of anything this size.
 *
 * What changed from the imported version, beyond the palette:
 *
 * - **The heading is a heading.** It shipped with an `<h3>` *inside* the
 *   button, which puts a heading in a place the accessibility tree does not
 *   expect. The `role="heading"` wrapper around the button is the shape the
 *   WAI-ARIA disclosure pattern asks for, and the one `ui/accordion.tsx`
 *   already used.
 * - **Springs became our two durations.** ROADMAP §3-5 puts opening and
 *   closing in the 150–300ms feedback band; a spring has no duration to put
 *   there. Exit is shorter than entry, which is the usual asymmetry — a thing
 *   leaving should not keep the reader waiting for the thing arriving.
 * - **Everything that can be CSS is CSS.** Only the panel's height and the
 *   plus's rotation go through framer-motion, because only those need a
 *   measured value or an interpolated angle. CSS transitions obey the
 *   `prefers-reduced-motion` block in `globals.css`; framer-motion does not,
 *   which is why `useReducedMotion` appears below and why the surface it
 *   covers is kept as small as it can be.
 * - **Physical directions were mirrored.** `ml-auto` → `ms-auto`,
 *   `origin-left` → `origin-right`, and the title's hover nudge reversed sign:
 *   on an RTL page the marker sits on the right, so a title that moved right
 *   would lean into it instead of away.
 */

/** The `inert` property is not in the DOM lib React ships against. */
type Inertable = HTMLElement & { inert?: boolean };

const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_IO = [0.65, 0, 0.35, 1] as const;

const OPEN = { duration: 0.22, ease: EASE } as const;
const SHUT = { duration: 0.16, ease: EASE_IO } as const;
const INSTANT = { duration: 0 } as const;

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  /** An optional way onward, rendered under the answer. */
  link?: { href: string; label: string };
};

export function FaqAccordion({ items }: { items: readonly FaqEntry[] }) {
  const reduced = useReducedMotion();

  // `useAccordion` wants only the ids, and it keys memoised callbacks off the
  // array identity — rebuilding it every render would rebuild those with it.
  const entries = React.useMemo(() => items.map(({ id }) => ({ id })), [items]);

  const { isOpen, headerProps, panelProps } = useAccordion({
    items: entries,
    type: "single",
  });

  return (
    <div className="border-t border-line">
      {items.map((item, index) => (
        <FaqRow
          key={item.id}
          item={item}
          index={index}
          open={isOpen(item.id)}
          reduced={Boolean(reduced)}
          header={headerProps(item.id)}
          panel={panelProps(item.id)}
        />
      ))}
    </div>
  );
}

function FaqRow({
  item,
  index,
  open,
  reduced,
  header,
  panel,
}: {
  item: FaqEntry;
  index: number;
  open: boolean;
  reduced: boolean;
  header: ReturnType<ReturnType<typeof useAccordion>["headerProps"]>;
  panel: ReturnType<ReturnType<typeof useAccordion>["panelProps"]>;
}) {
  const { ref, height, ready } = useAutoHeight();

  React.useEffect(() => {
    const el = ref.current as Inertable | null;
    if (!el) return;
    el.inert = !open;
    return () => {
      el.inert = false;
    };
  }, [ref, open]);

  // Persian figures, so no `font-figure` — that face carries latin digits only
  // and a Persian one wearing that class falls through to the system face.
  // Padded to two so the column stays a column past the ninth question.
  const marker = formatNumber(index + 1).padStart(2, "۰");

  return (
    <div>
      <div role="heading" aria-level={3}>
        <button
          {...header}
          className="group relative flex w-full items-center gap-4 py-5 text-start outline-none sm:gap-6"
        >
          {/* The marker fills in when the answer is open: an outline while the
              question is just one of a list, a solid mark once it is the one
              being read. */}
          <span
            aria-hidden="true"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full border text-[13px]",
              "transition-colors duration-[--dur-feedback]",
              open
                ? "border-ink bg-ink text-on-cta"
                : "border-line-2 text-muted group-hover:border-ink-2 group-hover:text-ink-2 group-focus-visible:border-ink-2 group-focus-visible:text-ink-2",
            )}
          >
            {marker}
          </span>

          {/* `-translate-x` is physical and stays physical. On this page the
              marker is on the right, so leftward is the direction that opens
              space rather than closing it. */}
          <span
            className={cn(
              "min-w-0 flex-1 text-[16px] font-medium leading-loose sm:text-[17px]",
              "transition-[color,transform] duration-[--dur-feedback] ease-[cubic-bezier(.16,1,.3,1)]",
              open
                ? "-translate-x-1 text-ink"
                : "text-ink-2 group-hover:-translate-x-1 group-hover:text-ink group-focus-visible:text-ink",
            )}
          >
            {item.question}
          </span>

          <motion.svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={cn(
              "ms-auto shrink-0 transition-colors duration-[--dur-feedback]",
              open ? "text-ink" : "text-muted group-hover:text-ink-2",
            )}
            initial={false}
            animate={{ rotate: open ? 45 : 0 }}
            transition={reduced ? INSTANT : OPEN}
          >
            <path
              d="M8 1V15M1 8H15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </motion.svg>

          {/* The rule every row keeps, and the darker one that draws over it.
              `origin-right` because the row is read from the right: the line
              should grow the way the eye travels, not toward it.

              220ms rather than the header's 450ms. Both are hover feedback and
              ROADMAP §3-5 caps that at 300ms; the header predates the band and
              is the outlier, so the newer surface follows the rule instead of
              the precedent. */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-line" />
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 bottom-0 h-px origin-right bg-ink",
              "transition-transform duration-[--dur-feedback] ease-[cubic-bezier(.16,1,.3,1)]",
              open ? "scale-x-100" : "scale-x-0 group-hover:scale-x-[0.3]",
            )}
          />
        </button>
      </div>

      {/* The answer stays in the document at every state — height goes to zero,
          nothing unmounts. A question page whose answers are not in the HTML is
          a question page search engines and find-in-page cannot read. */}
      <motion.div
        initial={false}
        animate={ready ? { height: open ? height : 0 } : {}}
        transition={reduced ? INSTANT : open ? OPEN : SHUT}
        style={{ overflow: "hidden", height: ready ? undefined : open ? "auto" : 0 }}
      >
        <div {...panel} ref={ref}>
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={reduced ? INSTANT : open ? { duration: 0.18, ease: EASE } : { duration: 0.14, ease: EASE_IO }}
            // Indented to clear the marker column: 40px of circle plus the row
            // gap, so the answer starts where the question does.
            className="pb-8 pe-2 ps-14 pt-1 text-[14.5px] leading-loose text-ink-2 sm:pe-12 sm:ps-16"
          >
            <p>{item.answer}</p>
            {item.link ? (
              <Link
                href={item.link.href}
                className="mt-4 inline-flex h-11 items-center text-[13.5px] text-accent transition-colors duration-[--dur-feedback] hover:text-accent-strong"
              >
                {item.link.label}
              </Link>
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
