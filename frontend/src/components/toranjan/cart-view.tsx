"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/lib/api/client";
import { formatNumber, formatSize } from "@/lib/format";
import { MAX_PER_LINE, useCartLines, useCartStore, type CartLine } from "@/lib/store/cart";

/**
 * The cart.
 *
 * From [kokonutd/interactive-checkout](https://21st.dev/@kokonutd/components/interactive-checkout),
 * whose geometry is kept: a column of rows beside a sticky summary panel, rows
 * that lay themselves out again when one leaves, a stepper of minus / count /
 * plus, and a total that rolls rather than cuts.
 *
 * What changed, and why:
 *
 * - **The left column is the cart, not a catalogue.** The original browses
 *   products on the left and collects them on the right, which is a demo of
 *   adding to a cart rather than a cart. Here the rows the panel used to hold
 *   are promoted to full width — same row, more room — and the panel keeps only
 *   what it was already for: the total and the way out.
 * - **A carpet is bought by size**, so each row carries its own dimensions.
 *   Two sizes of one carpet are two rows, because they are two purchases with
 *   two prices.
 * - **`zinc` becomes our tokens.** The registry's palette is its own; nothing
 *   in it survives except the shape it makes.
 * - **`NumberFlow` had to go, and the movement it carried did not.** The
 *   registry rolls its total on a component that animates each digit as a
 *   column of 0–9. Persian figures are not in that column: given `fa-IR` it
 *   renders `--current: NaN` and shows nothing at all. §3-5 asks for Persian
 *   figures on every price and that is not negotiable, so the total is
 *   formatted the way the rest of the shop formats money and the change is
 *   animated the way this codebase already animates a changing word — one
 *   value leaving behind a mask as the next arrives.
 *
 * Gone with §6's closed scope: the discount field and the shipping line. There
 * is no coupon system and no shipping calculation, and a row of zeros is worse
 * than no row.
 */

function lineTotal(line: CartLine): number {
  const unit = Number(line.unitPrice);
  return Number.isFinite(unit) ? unit * line.quantity : 0;
}

/**
 * A price that changes, and is seen to change.
 *
 * The figure is swapped rather than faded: the old one rises out behind a
 * mask, the new one arrives from below. It is the same gesture the add-to-cart
 * button uses for its label, so a number changing here reads as the same kind
 * of event as a confirmation there. `overflow-hidden` on a row of text is what
 * makes it a mask; without it the two figures merely cross over each other.
 */
function Toman({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="relative inline-grid overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={reduced ? { opacity: 0 } : { y: "115%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: "-115%", opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            // No `font-figure` here: these are Persian figures and that face
            // is subset to Latin digits.
            //
            // No `tabular-nums` either, and that line used to say the opposite
            // — «Vazirmatn has them, and they stop the total shifting width as
            // it rolls». It has them, and they are not for these digits: the
            // feature leaves Vazirmatn's Latin figures untouched and pads every
            // Persian one, so «۱٬۸۹۹٬۰۰۰» was set with its digits standing
            // apart. Measured, and recorded in `CountUp`. The total does shift
            // width when it rolls now, which is a thing that happens once per
            // press and is already an animation.
            className={`col-start-1 row-start-1 ${className ?? ""}`}
          >
            {formatNumber(value)}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-[12px] text-muted">تومان</span>
    </span>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const changeQuantity = useCartStore((state) => state.changeQuantity);
  const remove = useCartStore((state) => state.remove);
  const image = mediaUrl(line.imageUrl);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ opacity: { duration: 0.2 }, layout: { duration: 0.24 } }}
      className="flex gap-4 rounded-xl border border-line bg-paper p-3 shadow-panel sm:p-4"
    >
      <Link
        href={`/carpets/${line.carpetSlug}`}
        className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-bg sm:w-24"
      >
        {image && (
          <Image
            src={image}
            alt={line.carpetName}
            fill
            sizes="96px"
            className="object-contain p-1.5"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm leading-[1.8]">
              <Link href={`/carpets/${line.carpetSlug}`} className="hover:text-accent">
                {line.carpetName}
              </Link>
            </h3>
            <p className="mt-1 text-[12px] text-muted">
              {formatSize(line.widthCm, line.lengthCm)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove(line.variantId)}
            aria-label={`حذف ${line.carpetName} از سبد`}
            // No negative inline margin. Pulling a 44px target out past the
            // row's padding put four pixels beyond the viewport at 375, and a
            // page that scrolls sideways fails §3-5 for the sake of an
            // alignment nobody asked for.
            className="-mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          {/* 44px targets, not the registry's 24 — ROADMAP §3-5. */}
          <div className="flex items-center gap-1 rounded-full border border-line-2">
            <button
              type="button"
              onClick={() => changeQuantity(line.variantId, -1)}
              aria-label="یکی کمتر"
              className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-bg hover:text-ink"
            >
              <Minus className="size-4" />
            </button>
            <span
              aria-live="polite"
              aria-label={`تعداد: ${formatNumber(line.quantity)}`}
              className="min-w-6 text-center text-sm"
            >
              {formatNumber(line.quantity)}
            </span>
            <button
              type="button"
              onClick={() => changeQuantity(line.variantId, 1)}
              disabled={line.quantity >= MAX_PER_LINE}
              aria-label="یکی بیشتر"
              className="grid size-11 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-bg hover:text-ink disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <p className="text-sm">
            <Toman value={lineTotal(line)} />
          </p>
        </div>
      </div>
    </motion.li>
  );
}

function EmptyCart() {
  return (
    <div className="rounded-xl border border-line bg-paper px-6 py-16 text-center shadow-panel">
      <ShoppingBag className="mx-auto size-8 text-muted" aria-hidden />
      <p className="mt-5 text-lg font-light">سبد خرید خالی است</p>
      <p className="mt-2 text-sm leading-loose text-muted">
        هر فرشی را می‌توانید پیش از خرید، با اندازه‌ی واقعی روی کف خانه‌ی خودتان ببینید.
      </p>
      <Button asChild className="mt-7 h-12 gap-2 rounded-full px-7">
        <Link href="/carpets">دیدن فرش‌ها</Link>
      </Button>
    </div>
  );
}

export function CartView() {
  const reduced = useReducedMotion();
  const { lines, hydrated } = useCartLines();

  const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);
  const pieces = lines.reduce((sum, line) => sum + line.quantity, 0);

  // Until localStorage has been read there is nothing true to say, and
  // «your cart is empty» is the one wrong thing to say to someone whose cart
  // is not. A quiet placeholder holds the space for the one tick it takes.
  if (!hydrated) {
    return (
      <div className="h-64 animate-pulse rounded-xl border border-line bg-paper" aria-hidden />
    );
  }

  if (lines.length === 0) return <EmptyCart />;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <motion.ul layout className="flex flex-1 flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {lines.map((line) => (
            <CartRow key={line.variantId} line={line} />
          ))}
        </AnimatePresence>
      </motion.ul>

      <motion.aside
        layout
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="w-full rounded-xl border border-line bg-paper p-5 shadow-raised lg:sticky lg:top-24 lg:w-80"
      >
        <h2 className="text-[12px] tracking-[0.1em] text-muted">خلاصه‌ی سفارش</h2>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm text-ink-2">{formatNumber(pieces)} قلم</span>
          <p>
            <Toman value={total} className="text-xl" />
          </p>
        </div>

        {/* Nothing is added to this number afterwards: there is no shipping
            calculation and no coupon, and §6 puts both out of scope. Saying so
            is better than letting a shopper wonder what the next screen adds. */}
        <p className="mt-3 text-[12px] leading-loose text-muted">
          هزینه‌ی ارسال هنگام تماس برای هماهنگی تحویل اعلام می‌شود.
        </p>

        <Button asChild size="lg" className="mt-6 h-13 w-full gap-2 rounded-full text-[15px]">
          <Link href="/checkout">
            ادامه و ثبت سفارش
            <ChevronLeft className="size-5" />
          </Link>
        </Button>

        {/* `h-11`: the ghost variant's default is 40px, four short of §3-5. */}
        <Button asChild variant="ghost" className="mt-2 h-11 w-full rounded-full text-sm text-muted">
          <Link href="/carpets">ادامه‌ی خرید</Link>
        </Button>
      </motion.aside>
    </div>
  );
}
