import type { Metadata } from "next";

import { CarpetGrid } from "./carpet-grid";
import { FiltersShell } from "./filters-shell";
import { MATERIAL_LABEL, PATTERN_LABEL, ROOM_LABEL } from "@/lib/taxonomy";
import type { CarpetFilters, CarpetMaterial, CarpetPattern, RoomType } from "@/lib/api/types";

export const metadata: Metadata = {
  title: "همه‌ی فرش‌ها",
  description:
    "فرش دستباف و ماشینی، با امکان دیدن هر فرش با ابعاد واقعی روی کف خانه‌ی خودتان.",
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

  // Repeatable filters keep every value: ?material=silk&material=wool. Each is
  // checked against the taxonomy, so one bad entry drops itself rather than the
  // whole selection.
  const many = <T extends string>(k: string, allowed: Record<string, unknown>): T[] => {
    const v = params[k];
    const list = v === undefined ? [] : Array.isArray(v) ? v : [v];
    return [...new Set(list.filter((x) => x in allowed))] as T[];
  };

  const pattern = many<CarpetPattern>("pattern", PATTERN_LABEL);
  const material = many<CarpetMaterial>("material", MATERIAL_LABEL);
  const room = many<RoomType>("room", ROOM_LABEL);
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
    ...(pattern.length ? { pattern } : {}),
    ...(material.length ? { material } : {}),
    ...(room.length ? { room } : {}),
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
      lede: "نتیجه‌ها را می‌توانید با فیلترها باریک‌تر کنید.",
    };
  }
  // Only a single choice earns its own heading; two patterns have no shared
  // name, and «فرش‌های نقش لچک‌ترنج و افشان» reads worse than the plain title.
  if (filters.pattern?.length === 1) {
    return {
      title: `فرش‌های نقش ${PATTERN_LABEL[filters.pattern[0]]}`,
      lede: "هر فرش را پیش از خرید، با ابعاد واقعی روی کف خانه‌ی خودتان ببینید.",
    };
  }
  if (filters.material?.length === 1) {
    return {
      title: `فرش‌های ${MATERIAL_LABEL[filters.material[0]]}`,
      lede: "هر فرش را پیش از خرید، با ابعاد واقعی روی کف خانه‌ی خودتان ببینید.",
    };
  }
  if (filters.room?.length === 1) {
    return {
      title: `فرش مناسب ${ROOM_LABEL[filters.room[0]]}`,
      lede: "اندازه و نقش‌هایی که برای این فضا انتخاب شده‌اند.",
    };
  }
  return {
    title: "همه‌ی فرش‌ها",
    lede: "هر فرش را پیش از خرید، با ابعاد واقعی روی کف خانه‌ی خودتان ببینید.",
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
