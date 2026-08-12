"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Cuboid, Scale, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { carpetListQuery, carpetQuery } from "@/lib/api/catalog";
import { ApiError, mediaUrl } from "@/lib/api/client";
import type { CarpetDetail, CarpetListItem } from "@/lib/api/types";
import { formatNumber, formatSize, formatToman } from "@/lib/format";
import { COMPARE_LIMIT, useCompare } from "@/lib/store/compare";
import { MATERIAL_LABEL, PATTERN_LABEL, ROOM_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The comparison table (ROADMAP §6-11, second half).
 *
 * **Two requests deep, and deliberately.** The device stores ids; the listing
 * endpoint turns a set of ids into rows — that repeatable `id` filter was built
 * for the favourites and needs nothing added here. But a comparison worth the
 * name compares the things a listing row does not carry: the city it was woven
 * in, which rooms it suits, and above all the sizes, each with its own price and
 * its own AR file. Those live on `/carpets/{slug}`, so the slugs come back from
 * the first request and the details are fetched from them. Four detail requests
 * at worst, all in parallel, all cached by the same keys the product pages use —
 * a visitor who has already looked at two of these carpets pays for two.
 *
 * **An id that no longer comes back is dropped, not drawn as a gap.** Same rule
 * as the favourites: it is a carpet the shop retired. It stays in storage until
 * it is removed by hand, which costs nothing.
 *
 * The table is a real `<table>`. A grid of divs would look identical and tell a
 * screen reader nothing — here the whole point is that a cell belongs to both a
 * carpet and a property, which is what `scope="col"` and `scope="row"` say.
 */

/** One column: what the store remembers, plus what the catalogue answered. */
interface Entry {
  id: number;
  item: CarpetListItem;
  detail: CarpetDetail | undefined;
}

/**
 * A row of the table.
 *
 * `text` exists so the «only what differs» filter has something to compare. It
 * is the plain-language version of the cell, which is what a reader means by
 * «the same» — two carpets whose colours are stored as different hex triples but
 * read as «۴ رنگ» are not distinguishable in this table, and a row nobody can
 * tell apart is exactly what the filter is for hiding.
 */
interface Row {
  key: string;
  label: string;
  text: (entry: Entry) => string;
  render?: (entry: Entry, context: { lowestPrice: number | null }) => React.ReactNode;
  /**
   * The cell needs `/carpets/{slug}` to have answered.
   *
   * Declared per row rather than inferred, because the two cases look the same
   * from the outside and mean opposite things: a row that reads «—» because the
   * carpet has no origin recorded, and a row that reads «—» because the request
   * is still in flight. The second one gets a loading bar.
   */
  needsDetail?: boolean;
}

function priceOf(entry: Entry): number | null {
  const raw = entry.item.min_price;
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const ROWS: Row[] = [
  {
    key: "price",
    label: "از",
    text: (entry) => formatToman(entry.item.min_price),
    render: (entry, { lowestPrice }) => {
      const price = priceOf(entry);
      const cheapest = price !== null && lowestPrice !== null && price === lowestPrice;
      return (
        <>
          <span className={cn("text-[15px]", cheapest && "font-semibold")}>
            {formatToman(entry.item.min_price)}
          </span>
          {/* Gold, and small. §3-5's two-role split puts the accent on signals
              like this one and keeps it off anything with area. */}
          {cheapest && (
            <span className="mt-1 block text-[11px] text-accent">کم‌ترین قیمت</span>
          )}
        </>
      );
    },
  },
  {
    key: "pattern",
    label: "طرح",
    text: (entry) => PATTERN_LABEL[entry.item.pattern],
  },
  {
    key: "material",
    label: "جنس",
    text: (entry) => MATERIAL_LABEL[entry.item.material],
  },
  {
    key: "origin",
    label: "شهر",
    needsDetail: true,
    text: (entry) => entry.detail?.origin ?? "—",
  },
  {
    key: "sizes",
    label: "اندازه‌ها",
    needsDetail: true,
    text: (entry) =>
      (entry.detail?.variants ?? [])
        .map((variant) => formatSize(variant.width_cm, variant.length_cm))
        .join("، ") || "—",
    render: (entry) => {
      const variants = entry.detail?.variants ?? [];
      if (variants.length === 0) return <span className="text-muted">—</span>;
      // Ordered small to large. The API returns them in insertion order, which
      // is the order the shopkeeper typed them and means nothing to a reader
      // deciding whether one carpet comes bigger than another.
      const sorted = [...variants].sort(
        (a, b) => a.width_cm * a.length_cm - b.width_cm * b.length_cm,
      );
      return (
        <ul className="space-y-1.5">
          {sorted.map((variant) => (
            <li key={variant.id} className="leading-relaxed">
              {formatSize(variant.width_cm, variant.length_cm)}
              {variant.stock === 0 && (
                <span className="ms-1.5 text-[11px] text-muted">(ناموجود)</span>
              )}
            </li>
          ))}
        </ul>
      );
    },
  },
  {
    key: "rooms",
    label: "مناسب برای",
    needsDetail: true,
    text: (entry) =>
      (entry.detail?.suitable_rooms ?? []).map((room) => ROOM_LABEL[room]).join("، ") || "—",
  },
  {
    key: "colors",
    label: "رنگ‌ها",
    // Not the hex values: those are extracted per photograph and are all but
    // unique, so a diff on them would call every row different. What a reader
    // compares here is the swatch, and the filter should agree with the eye.
    text: (entry) =>
      entry.item.colors.length > 0 ? `${entry.item.colors.length} رنگ` : "—",
    render: (entry) => {
      if (entry.item.colors.length === 0) return <span className="text-muted">—</span>;
      return (
        <span className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
          {entry.item.colors.slice(0, 6).map((hex, i) => (
            <span
              key={hex + i}
              // Read, never chosen — the same rule the card follows.
              aria-hidden
              className="size-5 rounded-full ring-1 ring-ink/10"
              style={{ backgroundColor: hex }}
            />
          ))}
        </span>
      );
    },
  },
  {
    key: "ar",
    label: "واقعیت افزوده",
    needsDetail: true,
    text: (entry) => {
      const variants = entry.detail?.variants ?? [];
      if (variants.length === 0) return "—";
      const ready = variants.filter((variant) => variant.ar_status === "ready").length;
      if (ready === 0) return "هنوز آماده نیست";
      if (ready === variants.length) return "همه‌ی اندازه‌ها";
      return `${formatNumber(ready)} از ${formatNumber(variants.length)} اندازه`;
    },
  },
];

/**
 * How many columns a phone gets.
 *
 * Two, and the rest of the shortlist waits behind a picker. Four columns on a
 * 375px screen is 84px of carpet each — the table technically fits by scrolling
 * sideways, and sideways scrolling is exactly what makes it unreadable: you
 * cannot compare two things you cannot see at once, so a four-column table on a
 * phone is a list wearing a table's clothes.
 */
const MOBILE_COLUMNS = 2;

export function CompareTable() {
  const compare = useCompare();
  const [onlyDifferences, setOnlyDifferences] = React.useState(false);
  // Which two carpets the phone shows. Ids rather than positions, so removing a
  // column does not silently swap a different carpet into the reader's slot.
  const [slots, setSlots] = React.useState<[number | null, number | null]>([null, null]);

  const list = useQuery({
    ...carpetListQuery({ id: compare.ids, page_size: COMPARE_LIMIT }),
    // An empty `id` list reads as «no id filter» and would fetch the whole
    // catalogue back as somebody's shortlist.
    enabled: compare.hydrated && compare.ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const items = React.useMemo(() => list.data?.items ?? [], [list.data]);

  // Slugs, in store order. `useQueries` needs a stable-length array, and this
  // is one per surviving id.
  const ordered = React.useMemo(() => {
    const byId = new Map(items.map((carpet) => [carpet.id, carpet]));
    return compare.ids
      .map((id) => byId.get(id))
      .filter((carpet): carpet is CarpetListItem => carpet !== undefined);
  }, [compare.ids, items]);

  const details = useQueries({
    queries: ordered.map((carpet) => ({
      ...carpetQuery(carpet.slug),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const entries: Entry[] = ordered.map((item, i) => ({
    id: item.id,
    item,
    detail: details[i]?.data,
  }));

  const detailsSettled = details.every((query) => !query.isPending);

  /* ---- which two the phone shows ---------------------------------------
     Derived rather than kept in sync with an effect. A slot holds an id only
     while that id is still in the shortlist; the moment a column is removed the
     expression below falls back to the first carpet that is left, so there is
     no window where the picker points at a carpet the table no longer has. */
  const liveIds = entries.map((entry) => entry.id);
  const slotA = slots[0] !== null && liveIds.includes(slots[0]) ? slots[0] : liveIds[0];
  const slotB =
    slots[1] !== null && liveIds.includes(slots[1]) && slots[1] !== slotA
      ? slots[1]
      : liveIds.find((id) => id !== slotA);
  const shownOnPhone = new Set([slotA, slotB].filter((id): id is number => id !== undefined));

  if (!compare.hydrated) {
    return <div className="h-72 animate-pulse rounded-xl border border-line bg-paper" aria-hidden />;
  }

  if (compare.ids.length === 0) {
    return <EmptyState />;
  }

  if (list.isPaused) {
    return (
      <p className="rounded-md border border-line bg-paper p-6 text-sm leading-loose">
        ارتباط با سرور در دسترس نیست. به‌محض برقراری اتصال، خودش ادامه می‌دهد.
      </p>
    );
  }

  if (list.isPending) {
    return <div className="h-72 animate-pulse rounded-xl border border-line bg-paper" aria-hidden />;
  }

  if (list.error) {
    return (
      <p className="rounded-md border border-line bg-paper p-6 text-sm leading-loose">
        {list.error instanceof ApiError ? list.error.message : "فرش‌های انتخاب‌شده بارگذاری نشدند."}
      </p>
    );
  }

  if (entries.length === 0) {
    return <EmptyState retired />;
  }

  const prices = entries.map(priceOf).filter((price): price is number => price !== null);
  const lowestPrice = prices.length > 1 ? Math.min(...prices) : null;

  // Only once every detail has answered. Filtering on a half-loaded table would
  // hide rows that are «the same» purely because both cells are still empty,
  // and then show them again a moment later.
  //
  // Compared across the whole shortlist, not across the two columns a phone
  // happens to be showing. Which columns those are is decided by CSS at each
  // width, and this list is decided once in JavaScript; narrowing it to the
  // visible pair would mean the *rows* changed when the window was resized. The
  // cost is a row that survives the filter because carpets three and four
  // differ, and reads identical on a phone showing one and two.
  const rows =
    onlyDifferences && detailsSettled && entries.length > 1
      ? ROWS.filter((row) => new Set(entries.map(row.text)).size > 1)
      : ROWS;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* «در مقایسه», not «کنار هم» — on a phone only two of them are. */}
        <p className="text-sm text-muted">{formatNumber(entries.length)} فرش در مقایسه</p>

        <div className="flex items-center gap-1.5">
          {entries.length > 1 && (
            <Toggle
              variant="outline"
              size="lg"
              pressed={onlyDifferences}
              onPressedChange={setOnlyDifferences}
              // Pressing it before the details land would hide rows for being
              // equally empty, so it waits rather than lying.
              disabled={!detailsSettled}
              className="rounded-full text-[13px]"
            >
              فقط تفاوت‌ها
            </Toggle>
          )}
          <button
            type="button"
            onClick={compare.clear}
            className="h-11 rounded-full px-4 text-[13px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
          >
            پاک کردن همه
          </button>
        </div>
      </div>

      {onlyDifferences && detailsSettled && rows.length === 0 && (
        <p className="mb-6 rounded-md border border-line bg-paper p-5 text-sm leading-loose">
          این فرش‌ها در هیچ‌کدام از مشخصات جدول با هم فرق ندارند — تفاوتشان در خود نقش
          است، که در عکس‌ها می‌بینید.
        </p>
      )}

      <PhoneColumnPicker
        entries={entries}
        slotA={slotA}
        slotB={slotB}
        onPick={(index, id) => {
          const current = [slotA, slotB];
          const other = current[index === 0 ? 1 : 0];
          // Choosing the carpet that already sits in the other slot swaps the
          // two rather than drawing one carpet twice.
          const partner = other === id ? current[index] : other;
          const pair = [id, partner].filter((value): value is number => value !== undefined);
          // Normalised to shortlist order, because the table draws its columns
          // in that order and CSS cannot reorder them per breakpoint. Without
          // this the picker would say «فرش نخست: تبریز» while تبریز stood in
          // the second column — the label would be describing a slot the table
          // does not have.
          const inOrder = liveIds.filter((value) => pair.includes(value));
          setSlots([inOrder[0] ?? null, inOrder[1] ?? null]);
        }}
      />

      {/* **Two shapes, one table.** From `sm` up this is the ordinary thing: a
          pinned property column on the reading edge and a column per carpet,
          scrolling inside its own box if the shortlist is long. Below `sm` the
          property name climbs out of that column and becomes a full-width line
          above its own values, and only two carpets are drawn.

          Four columns on a 375px screen is 84px of carpet each. The table fits
          by scrolling sideways, and sideways scrolling is what breaks it: two
          carpets you cannot see at once are two carpets you cannot compare. So
          the phone spends its width on two columns and its *height* on the
          values, which is the axis a phone actually has.

          It is one `<table>` at both widths, not two blocks with a `hidden`
          each. The columns line up across rows because they are real table
          columns; hiding the same column index in every row keeps them lined up,
          which two independent layouts would not.

          **No `-mx-5 px-5` bleed here, and it was tried.** Widening the box past
          the page gutter on a phone costs nothing anywhere else in this shop,
          but a sticky cell parks against the scrollport's *padding* edge, not
          its border edge — so the pinned column stopped 20px short of the screen
          and the carpet columns slid through the strip beside it. Measured, not
          guessed: `elementFromPoint` at x=365 of 375 returned a `<td>` that
          should have been behind the label. */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            مقایسه‌ی مشخصات فرش‌های انتخاب‌شده. روی صفحه‌ی بزرگ ستون نخست نام ویژگی است؛
            روی گوشی نام ویژگی بالای مقدارهایش می‌آید و دو فرش نشان داده می‌شود.
          </caption>

          <thead>
            <tr>
              <th
                scope="col"
                className="sticky start-0 z-20 hidden bg-bg pb-5 pe-3 align-bottom sm:table-cell sm:w-[150px] sm:min-w-[150px]"
              >
                <span className="sr-only">ویژگی</span>
              </th>
              {entries.map((entry) => (
                <th
                  key={entry.id}
                  scope="col"
                  className={cn(
                    "w-1/2 px-1.5 pb-5 align-bottom text-center font-normal",
                    // 190, not 200. Four columns at 200 plus the 150 label is
                    // 950 against the 945 a 1024 window leaves, so the widest
                    // laptop breakpoint the roadmap tests scrolled by five
                    // pixels to show nothing. At 190 the four fit and then grow
                    // to fill, which is 199 each — the same picture, unscrolled.
                    "sm:w-auto sm:min-w-[190px] sm:px-3 sm:text-start",
                    !shownOnPhone.has(entry.id) && "hidden sm:table-cell",
                  )}
                >
                  <CarpetHeading entry={entry} onRemove={() => compare.remove(entry.id)} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <React.Fragment key={row.key}>
                {/* The phone's property line. `colgroup` rather than `row`:
                    below `sm` it heads the two cells beneath it, not the cells
                    beside it. The `sm` version of the same label is a proper
                    `scope="row"` and this one is gone, so a screen reader never
                    meets both. */}
                <tr className="sm:hidden">
                  <th
                    scope="colgroup"
                    colSpan={Math.min(entries.length, MOBILE_COLUMNS)}
                    className="border-t border-line pb-1 pt-4 text-start text-[11px] font-normal tracking-[0.14em] text-muted"
                  >
                    {row.label}
                  </th>
                </tr>

                <tr className="group/row">
                  <th
                    scope="row"
                    className="sticky start-0 z-10 hidden border-t border-line bg-bg py-4 pe-3 text-start align-top text-[13px] font-normal leading-relaxed text-muted sm:table-cell"
                  >
                    {row.label}
                  </th>
                  {entries.map((entry) => (
                    <td
                      key={entry.id}
                      className={cn(
                        "px-1.5 pb-4 align-top text-center leading-loose",
                        "sm:border-t sm:border-line sm:px-3 sm:py-4 sm:text-start sm:leading-relaxed",
                        !shownOnPhone.has(entry.id) && "hidden sm:table-cell",
                      )}
                    >
                      {/* A cell whose detail has not arrived shows a bar of the
                          right height rather than «—», which would read as «this
                          carpet has none». */}
                      {row.needsDetail && entry.detail === undefined ? (
                        <span className="mx-auto block h-4 w-16 animate-pulse rounded bg-line sm:mx-0" aria-hidden />
                      ) : (
                        (row.render?.(entry, { lowestPrice }) ?? row.text(entry))
                      )}
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            ))}

            <tr>
              <th
                scope="row"
                className="sticky start-0 z-10 hidden border-t border-line bg-bg py-5 pe-3 sm:table-cell"
              >
                <span className="sr-only">کنش‌ها</span>
              </th>
              {entries.map((entry) => (
                <td
                  key={entry.id}
                  className={cn(
                    "border-t border-line px-1.5 py-5 align-top sm:px-3",
                    !shownOnPhone.has(entry.id) && "hidden sm:table-cell",
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <Button asChild className="h-11 rounded-full text-[13px]">
                      <Link href={`/carpets/${entry.item.slug}`}>دیدن فرش</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 gap-1.5 rounded-full border-line-2 text-[13px] transition-colors duration-[--dur-feedback] hover:bg-cta hover:text-on-cta"
                    >
                      <Link href={`/carpets/${entry.item.slug}#ar`}>
                        <Cuboid className="size-4 text-accent" />
                        در خانه‌ی من
                      </Link>
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {compare.ids.length < COMPARE_LIMIT && (
        <p className="mt-8 text-sm text-muted">
          جا برای {formatNumber(COMPARE_LIMIT - compare.ids.length)} فرش دیگر هست —{" "}
          <Link
            href="/carpets"
            className="text-ink underline decoration-line-2 underline-offset-4 transition-colors duration-[--dur-feedback] hover:decoration-ink"
          >
            از فهرست فرش‌ها اضافه کنید
          </Link>
          .
        </p>
      )}
    </>
  );
}

/**
 * Which two carpets the phone draws.
 *
 * The alternative was the one the reference shops settle for: show the first two
 * and let the rest of the shortlist be invisible. That is fine until somebody
 * shortlists four carpets *on a phone*, which the tray lets them do — and then
 * half of what they chose is gone with nothing on screen admitting it.
 *
 * Two native `<select>`s, not a custom control: they are reachable, they read
 * correctly right-to-left, and they open the platform's own picker, which is
 * the right thing on the device this exists for. 16px because anything smaller
 * makes Safari zoom the page on focus and not zoom back — the same trap
 * `ui/input.tsx` records.
 */
function PhoneColumnPicker({
  entries,
  slotA,
  slotB,
  onPick,
}: {
  entries: Entry[];
  slotA: number | undefined;
  slotB: number | undefined;
  onPick: (index: 0 | 1, carpetId: number) => void;
}) {
  if (entries.length <= MOBILE_COLUMNS) return null;

  const slot = (index: 0 | 1, value: number | undefined, label: string) => (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-muted">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onPick(index, Number(event.target.value))}
        className="h-11 w-full truncate rounded-md border border-line-2 bg-paper px-3 text-base"
      >
        {entries.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.item.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="mb-6 sm:hidden">
      <p className="mb-3 text-[13px] leading-loose text-muted">
        روی گوشی {formatNumber(MOBILE_COLUMNS)} فرش کنار هم جا می‌شوند. انتخاب کنید کدام دو
        تا:
      </p>
      <div className="grid grid-cols-2 gap-3">
        {slot(0, slotA, "فرش نخست")}
        {slot(1, slotB, "فرش دوم")}
      </div>
    </div>
  );
}

/** The photograph, the name, and the way out of the comparison. */
function CarpetHeading({ entry, onRemove }: { entry: Entry; onRemove: () => void }) {
  const image = mediaUrl(entry.item.primary_image);

  return (
    <div className="relative">
      <Link
        href={`/carpets/${entry.item.slug}`}
        className="group/h block overflow-hidden rounded border border-line bg-paper"
      >
        <span className="relative block aspect-square">
          {image && (
            <Image
              src={image}
              alt={entry.item.name}
              fill
              sizes="(min-width: 640px) 240px, 45vw"
              className="object-contain p-3 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover/h:scale-[1.04]"
            />
          )}
        </span>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`برداشتن ${entry.item.name} از مقایسه`}
        // Hanging off the corner is the nicer picture and it is `sm`-only: an
        // absolutely positioned child still counts toward the scroll container's
        // width, so ten pixels past the outermost column gave the table four
        // pixels of scroll it had no business having. Inside the frame on a
        // phone, where the photograph's own padding leaves the corner empty.
        className="absolute top-0 end-0 grid size-11 place-items-center sm:-top-2.5 sm:-end-2.5"
      >
        <span className="grid size-7 place-items-center rounded-full border border-line bg-paper text-ink-2 shadow-sm transition-colors duration-[--dur-feedback] hover:border-cta hover:bg-cta hover:text-on-cta">
          <X className="size-3.5" />
        </span>
      </button>

      {/* `min-h-11` with the line centred inside it: the name was a 26px
          target. The photograph above is a link to the same carpet and is far
          larger, so this was never a dead end — but a title that wraps to two
          lines already clears the floor and a one-line one should not be the
          exception. `content-center` keeps the type where it was rather than
          pinning it to the top of a taller box. */}
      <Link
        href={`/carpets/${entry.item.slug}`}
        className="mt-3 block min-h-11 content-center text-[13.5px] leading-[1.9] hover:text-accent"
      >
        {entry.item.name}
      </Link>
    </div>
  );
}

function EmptyState({ retired = false }: { retired?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-paper px-6 py-16 text-center shadow-panel">
      <Scale className="mx-auto size-8 text-muted" aria-hidden />
      <p className="mt-5 text-lg font-light">
        {retired ? "فرش‌های انتخاب‌شده دیگر در فروشگاه نیستند" : "هنوز فرشی برای مقایسه انتخاب نکرده‌اید"}
      </p>
      <p className="mt-2 text-sm leading-loose text-muted">
        روی نشان ترازو در گوشه‌ی هر فرش بزنید تا {formatNumber(COMPARE_LIMIT)} فرش را کنار هم
        ببینید.
      </p>
      <Button asChild className="mt-7 h-12 rounded-full px-7">
        <Link href="/carpets">دیدن فرش‌ها</Link>
      </Button>
    </div>
  );
}
