/**
 * Persian formatting for the numbers a shopper reads.
 *
 * Quality bar of the roadmap, §۳-۵: figures and prices are shown with Persian
 * digits. Doing it in one place also keeps a backend detail from leaking into
 * the interface — prices arrive as decimal *strings*, and Postgres is free to
 * hand back `6.740E+7` for a number a person would write as ۶۷٬۴۰۰٬۰۰۰.
 */

const faDigits = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

/** Parse a decimal string from the API; `null` for anything not a number. */
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  // Handles the exponent form Postgres uses for numerics as readily as "67400000".
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** ۶۷٬۴۰۰٬۰۰۰ — grouped, Persian digits, no decimals. */
export function formatNumber(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : faDigits.format(parsed);
}

/**
 * ۱٫۵ — Persian digits keeping one decimal place.
 *
 * `formatNumber` deliberately drops decimals, because every number it was
 * written for is a count or a price and «۶۷٬۴۰۰٬۰۰۰٫۰۰ تومان» is not how anyone
 * writes money. The size guide brought the first quantities that are genuinely
 * fractional — a camera at 1.5 m, a floor of 22.8 square metres — and rounding
 * those turned a measurement into «۲ متر», which reads as a shrug.
 *
 * Note the separator: Persian writes the decimal mark as «٫» (U+066B), not as
 * the Latin full stop, and `Intl` handles that as long as it is asked for the
 * decimals at all.
 */
const faDecimal = new Intl.NumberFormat("fa-IR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatDecimal(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "—" : faDecimal.format(parsed);
}

/** ۶۷٬۴۰۰٬۰۰۰ تومان. Prices are stored in toman, so no conversion is involved. */
export function formatToman(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "قیمت به‌زودی" : `${faDigits.format(parsed)} تومان`;
}

/** ۲۰۰ × ۳۰۰ سانتی‌متر — the way a size is written on a carpet's label. */
export function formatSize(widthCm: number, lengthCm: number): string {
  return `${faDigits.format(widthCm)} × ${faDigits.format(lengthCm)} سانتی‌متر`;
}

/**
 * ۰۴:۳۲ — a duration counting down, not a time of day.
 *
 * Its own formatter rather than `faDigits`, for two reasons that both show up
 * only once it is on screen ticking. **`minimumIntegerDigits: 2`** is what pads
 * the seconds: without it the clock reads «۴:۹» at nine seconds past, which is
 * not a shorter way of writing a time, it is a different one. **`useGrouping:
 * false`** is what stops sixty *minutes* — a limiter window is free to be long
 * — from being printed as «۱٬۰۰۰», a thousand-separator inside a clock.
 *
 * Rendered `dir="ltr"` with `tabular-nums` wherever it is used: a clock is
 * left-to-right in Persian too, and proportional digits make the whole line
 * shuffle sideways on every tick.
 */
const faClockPart = new Intl.NumberFormat("fa-IR", {
  minimumIntegerDigits: 2,
  useGrouping: false,
});

export function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${faClockPart.format(minutes)}:${faClockPart.format(seconds)}`;
}

/**
 * ۱۶ مرداد ۱۴۰۵ — a Jalali date, which is the only calendar these dates are
 * ever read in.
 *
 * `fa-IR` alone is not enough and the difference is a whole calendar: the
 * locale gives Persian digits and Persian month names but keeps the Gregorian
 * reckoning, so today would print as «۷ اوت ۲۰۲۶» — right numerals, wrong year,
 * wrong month, and wrong in a way that looks convincing. The extension asks for
 * the calendar itself.
 *
 * Timestamps arrive from the API in UTC; the shop is one shop in one place, so
 * they are shown in the reader's own zone rather than converted to a fixed one.
 */
const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const faDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | Date | null | undefined): string {
  const parsed = toDate(value);
  return parsed === null ? "—" : faDate.format(parsed);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const parsed = toDate(value);
  return parsed === null ? "—" : faDateTime.format(parsed);
}
