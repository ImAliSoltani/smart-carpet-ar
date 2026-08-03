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

/** ۶۷٬۴۰۰٬۰۰۰ تومان. Prices are stored in toman, so no conversion is involved. */
export function formatToman(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? "قیمت به‌زودی" : `${faDigits.format(parsed)} تومان`;
}

/** ۲۰۰ × ۳۰۰ سانتی‌متر — the way a size is written on a carpet's label. */
export function formatSize(widthCm: number, lengthCm: number): string {
  return `${faDigits.format(widthCm)} × ${faDigits.format(lengthCm)} سانتی‌متر`;
}
