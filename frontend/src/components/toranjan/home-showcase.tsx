"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { ElegantCarousel, type CarouselSlide } from "@/components/ui/elegant-carousel";
import { carpetListQuery, carpetQuery } from "@/lib/api/catalog";
import { MATERIAL_LABEL, PATTERN_LABEL } from "@/lib/taxonomy";

/**
 * The showcase — a few carpets shown one at a time, with their own words.
 *
 * The home page already has rows of cards, and a row of cards is a good way to
 * compare four carpets and a poor way to admire one. This is the other thing: a
 * large photograph, the shop's own description of that weave, and the colour of
 * the carpet itself washed faintly behind it.
 *
 * **Chosen by a rule, not by a list of names.** The temptation was to hard-code
 * four slugs, and that is a front page that breaks the day someone retires a
 * carpet in the panel. The rule is «the most expensive silk and wool», which in
 * this catalogue is exactly the hand-knotted end of it — and it keeps working
 * as stock changes, without anyone remembering that this file exists.
 *
 * **Why two rounds of fetching.** The listing carries no prose; the description
 * that makes a slide worth reading only exists on the carpet's own record. So
 * the list picks the four, and four detail queries fetch what they say. They
 * are small, they run in parallel, and react-query keeps them — so a visitor
 * who then opens one of these carpets finds its page already loaded.
 */

/** How many carpets the showcase turns through. */
const COUNT = 4;

export function HomeShowcase() {
  const list = useQuery(
    carpetListQuery({ material: ["silk", "wool"], sort: "price_desc", page_size: COUNT }),
  );

  const slugs = list.data?.items.map((c) => c.slug) ?? [];
  const details = useQueries({ queries: slugs.map((slug) => carpetQuery(slug)) });

  // Everything or nothing. A carousel that pops in one slide at a time as four
  // requests land is worse than one that arrives whole a moment later, and this
  // sits high on the page where the movement would be most obvious.
  const ready = list.isSuccess && details.length > 0 && details.every((d) => d.isSuccess);
  if (!ready) {
    // Same silence as the card rows: a section of the front page that cannot
    // load is simply not there. Nothing below it depends on it.
    return list.isPending || details.some((d) => d.isPending) ? (
      <div className="mx-auto grid max-w-7xl animate-pulse items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-16">
        <div>
          <span className="block h-3 w-16 rounded bg-line" />
          <span className="mt-5 block h-6 w-3/4 rounded bg-line" />
          <span className="mt-4 block h-3 w-1/3 rounded bg-line" />
          <span className="mt-6 block h-3 w-full rounded bg-line" />
          <span className="mt-3 block h-3 w-5/6 rounded bg-line" />
          <span className="mt-8 block h-12 w-44 rounded-full bg-line" />
        </div>
        <span className="block aspect-4/5 rounded-2xl bg-line sm:aspect-3/4 lg:aspect-4/5" />
      </div>
    ) : null;
  }

  const slides: CarouselSlide[] = [];
  for (const query of details) {
    const carpet = query.data;
    if (!carpet) continue;
    const image = carpet.images.find((i) => i.is_primary) ?? carpet.images[0];
    // `full_url` rather than the card rendition: this panel is half the width
    // of a desktop window, where the card crop is visibly soft.
    const url = image?.full_url ?? image?.url;
    // A slide with no photograph is not a slide. Better a showcase of three.
    if (!url) continue;
    slides.push({
      id: carpet.id,
      title: carpet.name,
      subtitle: [carpet.origin, MATERIAL_LABEL[carpet.material], PATTERN_LABEL[carpet.pattern]]
        .filter(Boolean)
        .join(" · "),
      // A quarter of a phone's width holds one of those three, and only on a
      // phone — the wide layout has room for all three and keeps them.
      //
      // The pattern, not the city. The showcase is «the most expensive silk and
      // wool», which in this catalogue is two Qom silks and two others, so a
      // row labelled by origin read «قم، قم، اراک، کاشان» — two of four saying
      // the same word about two different carpets. The pattern is what the eye
      // is choosing between here anyway.
      shortLabel: PATTERN_LABEL[carpet.pattern],
      description: carpet.description ?? "",
      // The carpet's own dominant colour, which the descriptor pass already
      // worked out. Falling back to the accent keeps the wash on-brand rather
      // than absent if a record has no colours yet.
      accent: carpet.colors[0] ?? "var(--accent)",
      imageUrl: url,
      imageAlt: carpet.name,
      href: `/carpets/${carpet.slug}`,
    });
  }

  if (slides.length === 0) return null;

  return (
    <ElegantCarousel
      slides={slides}
      label="ویترین دستباف‌ها"
      heading="ویترین"
      note="گران‌بهاترین بافت‌های کاتالوگ، یکی‌یکی."
      ctaLabel="دیدن این فرش"
    />
  );
}
