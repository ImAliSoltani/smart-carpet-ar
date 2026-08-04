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
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
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
}: {
  values: readonly string[];
  label: (v: string) => string;
  counts: Record<string, number> | undefined;
  param: string;
}) {
  const params = useSearchParams();
  const write = useFilterWriter();
  const active = params.get(param);

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const count = counts?.[value];
        // A chip for something the shop does not stock is a dead end, and the
        // facets simply omit those keys rather than sending a zero.
        if (count === undefined) return null;
        const on = active === value;
        return (
          <Toggle
            key={value}
            size="sm"
            variant="outline"
            pressed={on}
            onPressedChange={() => write({ [param]: on ? null : value })}
            aria-label={`${label(value)}، ${formatNumber(count)} فرش`}
            className="gap-2 rounded-full"
          >
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

  const selected: [number, number] = [
    Number(params.get("min_price") ?? lo),
    Number(params.get("max_price") ?? hi),
  ];

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
      value={selected}
      minLabel="از"
      maxLabel="تا"
      format={formatToman}
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

  const applied: { key: string; text: string }[] = [];
  const q = params.get("q");
  const pattern = params.get("pattern");
  const material = params.get("material");
  const room = params.get("room");
  const minPrice = params.get("min_price");
  const maxPrice = params.get("max_price");

  if (q) applied.push({ key: "q", text: `«${q}»` });
  if (pattern && pattern in PATTERN_LABEL)
    applied.push({ key: "pattern", text: PATTERN_LABEL[pattern as never] });
  if (material && material in MATERIAL_LABEL)
    applied.push({ key: "material", text: MATERIAL_LABEL[material as never] });
  if (room && room in ROOM_LABEL)
    applied.push({ key: "room", text: ROOM_LABEL[room as never] });
  if (minPrice) applied.push({ key: "min_price", text: `از ${formatToman(minPrice)}` });
  if (maxPrice) applied.push({ key: "max_price", text: `تا ${formatToman(maxPrice)}` });

  if (applied.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {applied.map(({ key, text }) => (
        <button
          key={key}
          type="button"
          onClick={() => write({ [key]: null })}
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
            pattern: null,
            material: null,
            room: null,
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
          maxPanelHeight={280}
        />
      )}
    </div>
  );
}

export { SortControl };

/** The same panel, behind a button, for screens with no room for a sidebar. */
export function FilterTrigger({ onClick }: { onClick: () => void }) {
  const params = useSearchParams();
  const count = ["q", "pattern", "material", "room", "min_price", "max_price"].filter((k) =>
    params.get(k),
  ).length;

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
