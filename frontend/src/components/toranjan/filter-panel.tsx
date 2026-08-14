"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { RangeSlider } from "@/components/ui/range-slider";
import { Toggle } from "@/components/ui/toggle";
import { facetsQuery } from "@/lib/api/catalog";
import { formatNumber, formatToman } from "@/lib/format";
import {
  COLOR_LABEL,
  COLOR_SWATCH,
  FILTER_COLORS,
  MATERIAL_LABEL,
  NAV_MATERIALS,
  NAV_PATTERNS,
  NAV_ROOMS,
  PATTERN_LABEL,
  ROOM_LABEL,
} from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The filter panel.
 *
 * Built from three catalogue components — the accordion holds the sections,
 * the toggle is every chip, the range slider carries price — over the facet
 * counts the API now publishes. Nothing here counts what happens to be on
 * screen: a page is sixty rows of seventy carpets, so a locally counted chip
 * would describe the page.
 *
 * The URL is the state. Every control writes a query parameter and reads back
 * from one, which is why the header could link straight at
 * `/carpets?pattern=…` before this existed, why a narrowed shop survives a
 * reload and can be sent to somebody, and why there is no second copy of the
 * selection to fall out of step with the grid.
 */

const SORTS = [
  ["newest", "تازه‌ترین"],
  ["price_asc", "ارزان‌ترین"],
  ["price_desc", "گران‌ترین"],
] as const;

type Facets = ReturnType<typeof useFacets>["data"];

function useFacets() {
  return useQuery(facetsQuery());
}

/** Writes the query string, and never leaves a stale page number behind. */
function useFilterWriter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return React.useCallback(
    (changes: Record<string, string | string[] | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        next.delete(key);
        // A repeatable filter is written as one parameter per value, which is
        // what the API reads and what keeps the URL honest about the choice.
        if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
        else if (value !== null && value !== "") next.set(key, value);
      }
      // Narrowing the shop while standing on page four is how a visitor lands
      // in an empty grid that has results.
      if (!("page" in changes)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, params],
  );
}

function ChipRow({
  values,
  label,
  counts,
  param,
  swatch,
}: {
  values: readonly string[];
  label: (v: string) => string;
  counts: Record<string, number> | undefined;
  param: string;
  /** A hex to draw before the label. Only colour uses it — see COLOR_SWATCH. */
  swatch?: (v: string) => string;
}) {
  const params = useSearchParams();
  const write = useFilterWriter();
  // Several at once: silk *or* wool is the ordinary thing to want, and making
  // a shopper look twice and compare from memory is not a filter.
  const active = params.getAll(param);

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const count = counts?.[value];
        // A chip for something the shop does not stock is a dead end, and the
        // facets simply omit those keys rather than sending a zero.
        if (count === undefined) return null;
        const on = active.includes(value);
        return (
          <Toggle
            key={value}
            size="sm"
            variant="outline"
            pressed={on}
            onPressedChange={() =>
              write({
                [param]: on ? active.filter((v) => v !== value) : [...active, value],
              })
            }
            aria-label={`${label(value)}، ${formatNumber(count)} فرش`}
            // `h-11` over the registry's 36px `size="sm"`. These are the most
            // pressed controls on the listing and they were four short of the
            // §3-5 floor; the size stays `sm` for its type scale and padding.
            className="h-11 gap-2 rounded-full"
          >
            {swatch && (
              // Hairlined rather than bare: the pale families — نخودی, سفید —
              // are within a few percent of the paper they sit on, and without
              // an edge the chip reads as having lost its dot.
              <span
                aria-hidden="true"
                className="size-3.5 shrink-0 rounded-full border border-ink/15"
                style={{ backgroundColor: swatch(value) }}
              />
            )}
            <span>{label(value)}</span>
            <span className={cn("text-[11px]", on ? "opacity-70" : "text-muted")}>
              {formatNumber(count)}
            </span>
          </Toggle>
        );
      })}
    </div>
  );
}

function PriceSection({ facets }: { facets: Facets }) {
  const params = useSearchParams();
  const write = useFilterWriter();

  const lo = Number(facets?.min_price ?? 0);
  const hi = Number(facets?.max_price ?? 0);
  const histogram = facets?.price_histogram ?? [];

  // The slider wants each bar as a share of the tallest, not a raw count — and
  // on a square-root scale rather than a linear one. This catalogue is steeply
  // skewed: the cheapest bucket holds ninety-six sizes while most hold under
  // ten, so drawn linearly every bar but one is a five-percent smudge and the
  // shape the histogram exists to show disappears. The root keeps the ordering
  // and the peak honest while letting the tail be visible.
  const peak = Math.max(1, ...histogram);
  const bars = histogram.map((n) => Math.sqrt(n / peak));

  const fromUrl: [number, number] = [
    Number(params.get("min_price") ?? lo),
    Number(params.get("max_price") ?? hi),
  ];

  // The slider is controlled, so it renders whatever it is handed — and being
  // handed only the committed URL value is why it would not move at all: the
  // drag updated a state nobody was reading. The live position lives here and
  // the URL is written once, on release, rather than on every pixel.
  const [live, setLive] = React.useState<[number, number]>(fromUrl);
  const [seen, setSeen] = React.useState<string>(fromUrl.join());
  if (fromUrl.join() !== seen) {
    setSeen(fromUrl.join());
    setLive(fromUrl);
  }

  if (!(hi > lo)) return null;

  // A step of a hundred thousand toman: fine enough to land on a real price,
  // coarse enough that dragging does not produce a number nobody would type.
  const step = 100_000;

  return (
    <RangeSlider
      data={bars}
      min={Math.floor(lo / step) * step}
      max={Math.ceil(hi / step) * step}
      step={step}
      value={live}
      minLabel="از"
      maxLabel="تا"
      format={formatToman}
      onValueChange={setLive}
      onValueCommit={([min, max]) =>
        write({
          min_price: min <= lo ? null : String(min),
          max_price: max >= hi ? null : String(max),
        })
      }
    />
  );
}

function TextSearch() {
  const params = useSearchParams();
  const write = useFilterWriter();
  const fromUrl = params.get("q") ?? "";
  const [draft, setDraft] = React.useState(fromUrl);
  const [seen, setSeen] = React.useState(fromUrl);

  // The URL can change without this field — a chip, «پاک کردن همه», the back
  // button — and when it does the field has to follow rather than argue.
  // Adjusted during render rather than in an effect: React re-runs this pass
  // before committing anything, so the input never paints the stale word.
  if (fromUrl !== seen) {
    setSeen(fromUrl);
    setDraft(fromUrl);
  }

  React.useEffect(() => {
    if (draft === fromUrl) return;
    const id = setTimeout(() => write({ q: draft || null }), 350);
    return () => clearTimeout(id);
  }, [draft, fromUrl, write]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="نام یا نقش فرش…"
        aria-label="جست‌وجو در فرش‌ها"
        className="h-11 w-full rounded-md border border-line-2 bg-paper ps-10 pe-3 text-sm outline-none transition-colors duration-[--dur-feedback] placeholder:text-muted focus-visible:border-ink"
      />
    </div>
  );
}

function AppliedFilters() {
  const params = useSearchParams();
  const write = useFilterWriter();

  // One removable chip per chosen value, not one per filter — with several
  // materials selected, a single «جنس ✕» would take away a choice the visitor
  // did not point at.
  const applied: { key: string; value?: string; text: string }[] = [];
  const q = params.get("q");
  const minPrice = params.get("min_price");
  const maxPrice = params.get("max_price");

  if (q) applied.push({ key: "q", text: `«${q}»` });
  for (const [param, labels] of [
    ["pattern", PATTERN_LABEL],
    ["material", MATERIAL_LABEL],
    ["room", ROOM_LABEL],
    ["color", COLOR_LABEL],
  ] as const) {
    for (const value of params.getAll(param)) {
      if (value in labels)
        applied.push({ key: param, value, text: labels[value as never] });
    }
  }
  if (minPrice) applied.push({ key: "min_price", text: `از ${formatToman(minPrice)}` });
  if (maxPrice) applied.push({ key: "max_price", text: `تا ${formatToman(maxPrice)}` });

  if (applied.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {applied.map(({ key, value, text }) => (
        <button
          key={key + (value ?? "")}
          type="button"
          onClick={() =>
            write({
              [key]: value ? params.getAll(key).filter((v) => v !== value) : null,
            })
          }
          aria-label={`حذف فیلتر ${text}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-cta px-3 py-1.5 text-xs text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
        >
          {text}
          <X className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={() =>
          write({
            q: null,
            pattern: [],
            material: [],
            room: [],
            color: [],
            min_price: null,
            max_price: null,
          })
        }
        className="text-xs text-muted underline-offset-4 transition-colors duration-[--dur-feedback] hover:text-ink hover:underline"
      >
        پاک کردن همه
      </button>
    </div>
  );
}

function SortControl() {
  const params = useSearchParams();
  const write = useFilterWriter();
  const current = params.get("sort") ?? "newest";

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="shrink-0">مرتب‌سازی</span>
      <select
        value={current}
        onChange={(e) => write({ sort: e.target.value === "newest" ? null : e.target.value })}
        className="h-11 rounded-md border border-line-2 bg-paper px-3 text-sm text-ink outline-none transition-colors duration-[--dur-feedback] focus-visible:border-ink"
      >
        {SORTS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterPanel() {
  const { data: facets, isPending } = useFacets();

  const sections: AccordionItem[] = [
    {
      id: "pattern",
      title: "طرح",
      meta: facets ? formatNumber(Object.keys(facets.patterns).length) : undefined,
      content: (
        <ChipRow
          values={NAV_PATTERNS}
          label={(v) => PATTERN_LABEL[v as never]}
          counts={facets?.patterns}
          param="pattern"
        />
      ),
    },
    {
      id: "material",
      title: "جنس",
      meta: facets ? formatNumber(Object.keys(facets.materials).length) : undefined,
      content: (
        <ChipRow
          values={NAV_MATERIALS}
          label={(v) => MATERIAL_LABEL[v as never]}
          counts={facets?.materials}
          param="material"
        />
      ),
    },
    {
      id: "room",
      title: "اتاق",
      meta: facets ? formatNumber(Object.keys(facets.rooms).length) : undefined,
      content: (
        <ChipRow
          values={NAV_ROOMS}
          label={(v) => ROOM_LABEL[v as never]}
          counts={facets?.rooms}
          param="room"
        />
      ),
    },
    {
      id: "color",
      title: "رنگ",
      meta: facets ? formatNumber(Object.keys(facets.colors).length) : undefined,
      content: (
        <ChipRow
          values={FILTER_COLORS}
          label={(v) => COLOR_LABEL[v as never]}
          counts={facets?.colors}
          param="color"
          swatch={(v) => COLOR_SWATCH[v as never]}
        />
      ),
    },
    {
      id: "price",
      title: "بازه‌ی قیمت",
      content: <PriceSection facets={facets} />,
    },
  ];

  return (
    <div className="space-y-5">
      <TextSearch />
      <AppliedFilters />
      {isPending ? (
        <div className="h-64 animate-pulse rounded-md border border-line bg-paper" />
      ) : (
        <Accordion
          type="multiple"
          items={sections}
          defaultOpen={["pattern", "price"]}
        />
      )}
    </div>
  );
}

export { SortControl };

/** The same panel, behind a button, for screens with no room for a sidebar. */
export function FilterTrigger({ onClick }: { onClick: () => void }) {
  const params = useSearchParams();
  const count = [
    "q",
    "pattern",
    "material",
    "room",
    "color",
    "min_price",
    "max_price",
  ].reduce(
    (n, key) => n + params.getAll(key).length,
    0,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-md border border-line-2 bg-paper px-4 text-sm transition-colors duration-[--dur-feedback] hover:bg-bg lg:hidden"
    >
      <SlidersHorizontal className="size-4" />
      فیلترها
      {count > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] text-white">
          {formatNumber(count)}
        </span>
      )}
    </button>
  );
}
