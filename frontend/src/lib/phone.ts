/**
 * Iranian mobile numbers, normalised the way the backend normalises them.
 *
 * This is a deliberate copy of `normalize_phone` in `app/schemas/orders.py`,
 * and the two have to agree: checkout and tracking both send a number the
 * server will re-normalise and compare, so a rule that differs here means a
 * field the shopper cannot get past or an order they cannot find again.
 *
 * The digit maps are the point. Persian (۰۱۲۳) and Arabic-Indic (٠١٢٣) figures
 * are what an Iranian keyboard produces by default, so a validator that only
 * knows `0-9` rejects the ordinary case.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export const IRANIAN_MOBILE = /^(\+98|0)9\d{9}$/;

export function normalizePhone(value: string): string {
  let cleaned = value.replace(/[\s-]/g, "");
  for (let i = 0; i < 10; i += 1) {
    cleaned = cleaned.replaceAll(PERSIAN_DIGITS[i], String(i));
    cleaned = cleaned.replaceAll(ARABIC_DIGITS[i], String(i));
  }
  return cleaned;
}
