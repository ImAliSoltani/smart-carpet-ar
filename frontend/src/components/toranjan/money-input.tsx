"use client";

import * as React from "react";

import { formatNumber } from "@/lib/format";

/**
 * A toman box that groups itself as it is typed.
 *
 * Reported by the shopkeeper: a price is eight or nine digits, and
 * `۶۷۴۰۰۰۰۰` typed into a bare box is a number nobody can check without
 * counting the zeros with a fingertip. So the field shows what it will show in
 * the shop — Persian digits grouped with «٬», by the same `formatNumber` the
 * catalogue prints prices with — while the value handed back is still nothing
 * but ASCII digits, which is what the API is given.
 *
 * That split is the whole design. The caller keeps a raw string; this component
 * owns the punctuation and never lets it out.
 */

/**
 * Every digit in the string, as ASCII, and nothing else.
 *
 * Both non-ASCII digit sets are folded in, not out of politeness but because
 * both really arrive: a Persian keyboard produces ۰۱۲۳, a phone keypad set to
 * Arabic produces ٠١٢٣, and a price pasted out of a message can be either.
 * Everything else — the group marks this field writes itself, a stray space, a
 * «تومان» that came along with a paste — is dropped rather than rejected.
 */
export function toAsciiDigits(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x30 && code <= 0x39) out += ch;
    // ۰ U+06F0 (Persian) and ٠ U+0660 (Arabic-Indic)
    else if (code >= 0x06f0 && code <= 0x06f9) out += String(code - 0x06f0);
    else if (code >= 0x0660 && code <= 0x0669) out += String(code - 0x0660);
  }
  return out;
}

/**
 * As many digits as a price can actually be.
 *
 * `CarpetVariant.price` is `Numeric(12, 0)`, so a thirteenth digit is a value
 * the database will refuse — better to stop accepting it at the box than to
 * let it be typed, grouped, and rejected on save. It also keeps the figure
 * inside the range `Number` represents exactly, which is what `formatNumber`
 * parses through on its way to Persian digits.
 */
const MAX_TOMAN_DIGITS = 12;

/** `"6740000"` → `«۶٬۷۴۰٬۰۰۰»`. Empty stays empty, so the box can be cleared. */
export function groupToman(raw: string): string {
  if (!raw) return "";
  // Leading zeros are dropped by the formatter anyway; stripping them here as
  // well keeps the caret arithmetic below counting the same digits the box
  // shows. A price of exactly zero keeps its one digit.
  const trimmed = raw.replace(/^0+(?=\d)/, "");
  return formatNumber(trimmed);
}

/**
 * A price as it arrives from the API, as plain digits.
 *
 * Not `toAsciiDigits`, which would be wrong here in a way that looks right:
 * Postgres hands a `Numeric` back in whatever form it likes, and this
 * catalogue really does answer `"5.0E+5"` for five hundred thousand toman.
 * Keeping only the digits of that string gives `"505"`. So it is read as a
 * number first — the same reading `formatNumber` does for every price the shop
 * prints — and only then written out.
 */
export function tomanDigits(value: string | number | null | undefined): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.round(parsed));
}

/** Index in `text` just past its `n`th digit. */
function offsetAfterDigits(text: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (toAsciiDigits(text[i])) {
      seen += 1;
      if (seen === n) return i + 1;
    }
  }
  return text.length;
}

export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  /** ASCII digits only — what the API is sent. */
  value: string;
  onValueChange: (raw: string) => void;
}

export function MoneyInput({ value, onValueChange, ...props }: MoneyInputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  // Where the caret should land once React has painted the regrouped string.
  // Counted in *digits*, not characters, because the number of group marks
  // before the caret is exactly what changes when a digit is added: typing the
  // seventh digit of a price inserts a «٬» somewhere to the left of the caret,
  // and a caret restored to its old character index would drift one place left
  // on every group boundary crossed.
  const caretDigits = React.useRef<number | null>(null);

  React.useLayoutEffect(() => {
    const node = ref.current;
    const digits = caretDigits.current;
    caretDigits.current = null;
    if (!node || digits === null) return;
    const at = offsetAfterDigits(node.value, digits);
    node.setSelectionRange(at, at);
  });

  const shown = groupToman(value);

  return (
    <input
      {...props}
      ref={ref}
      // `inputMode`, not `type="number"`: a numeric input refuses a value with
      // group marks in it and would blank the field on the third digit.
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onChange={(event) => {
        const node = event.target;
        const caret = node.selectionStart ?? node.value.length;
        const raw = toAsciiDigits(node.value).slice(0, MAX_TOMAN_DIGITS);
        caretDigits.current = Math.min(
          toAsciiDigits(node.value.slice(0, caret)).length,
          raw.length,
        );
        onValueChange(raw);
      }}
    />
  );
}
