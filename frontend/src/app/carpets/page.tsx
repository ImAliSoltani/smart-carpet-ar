import type { Metadata } from "next";

import { CarpetGrid } from "./carpet-grid";
import { FiltersShell } from "./filters-shell";
import { MATERIAL_LABEL, PATTERN_LABEL, ROOM_LABEL } from "@/lib/taxonomy";
import type { CarpetFilters, CarpetMaterial, CarpetPattern, RoomType } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "همه‌ی فرش‌ها — ترنجان",
  description:
    "فرش دستباف و ماشینی، با امکان دیدن هر فرش با ابعاد واقعی روی کف خانه‌ی خودت.",
};

/**
 * Only the query keys this page understands are read, and each is checked
 * against the taxonomy before it is used. A stray `?pattern=<script>` then
 * never reaches the API or the heading — it is simply not a pattern.
 */
function readFilters(params: Record<string, string | string[] | undefined>): CarpetFilters {
  const one = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const pattern = one("pattern");
  const material = one("material");
  const room = one("room");
  const sort = one("sort");
  const q = one("q")?.trim();
  const page = Number(one("page"));

  // Prices arrive as text and go back out as numbers the API will validate;
  // anything that is not a finite number is dropped rather than forwarded.
  const price = (key: string) => {
    const n = Number(one(key));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const minPrice = price("min_price");
  const maxPrice = price("max_price");

  return {
    ...(q ? { q: q.slice(0, 100) } : {}),
    ...(pattern && pattern in PATTERN_LABEL ? { pattern: pattern as CarpetPattern } : {}),
    ...(material && material in MATERIAL_LABEL ? { material: material as CarpetMaterial } : {}),
    ...(room && room in ROOM_LABEL ? { room: room as RoomType } : {}),
    ...(minPrice !== undefined ? { min_price: minPrice } : {}),
    ...(maxPrice !== undefined ? { max_price: maxPrice } : {}),
    ...(sort === "price_asc" || sort === "price_desc" ? { sort } : {}),
    ...(Number.isInteger(page) && page > 1 ? { page } : {}),
    page_size: 24,
  };
}

/** The heading says what the visitor actually asked for, in their own words. */
function headingFor(filters: CarpetFilters): { title: string; lede: string } {
  if (filters.q) {
    return {
      title: `جست‌وجوی «${filters.q}»`,
      lede: "نتیجه‌ها را می‌توانی با فیلترها باریک‌تر کنی.",
    };
  }
  if (filters.pattern) {
    return {
      title: `فرش‌های نقش ${PATTERN_LABEL[filters.pattern]}`,
      lede: "هر فرش را پیش از خرید، با ابعاد واقعی روی کف خانه‌ی خودت ببین.",
    };
  }
  if (filters.material) {
    return {
      title: `فرش‌های ${MATERIAL_LABEL[filters.material]}`,
      lede: "هر فرش را پیش از خرید، با ابعاد واقعی روی کف خانه‌ی خودت ببین.",
    };
  }
  if (filters.room) {
    return {
      title: `فرش مناسب ${ROOM_LABEL[filters.room]}`,
      lede: "اندازه و نقش‌هایی که برای این فضا انتخاب شده‌اند.",
    };
  }
  return {
    title: "همه‌ی فرش‌ها",
    lede: "هر فرش را پیش از خرید، با ابعاد واقعی روی کف خانه‌ی خودت ببین.",
  };
}

export default async function CarpetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = readFilters(await searchParams);
  const { title, lede } = headingFor(filters);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 pb-28 sm:px-8">
      <header className="max-w-[760px] py-14 sm:py-20">
        <p className="ltr-isolate mb-5 font-label text-[10.5px] font-medium uppercase tracking-[0.42em] text-muted">
          Collection
        </p>
        <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.25] tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-5 max-w-[46ch] text-[15px] leading-[2.1] text-muted sm:text-[17px]">
          {lede}
        </p>
      </header>

      <FiltersShell>
        <CarpetGrid filters={filters} />
      </FiltersShell>
    </main>
  );
}
