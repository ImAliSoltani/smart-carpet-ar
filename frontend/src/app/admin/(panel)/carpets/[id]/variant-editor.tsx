"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";

import { EASE_OUT } from "@/components/toranjan/admin-motion";
import { MoneyInput, tomanDigits } from "@/components/toranjan/money-input";
import { addVariant, adminKeys, deleteVariant, updateVariant } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminCarpetDetail, VariantOut } from "@/lib/api/types";
import { formatNumber, formatSize, formatToman } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The sizes a carpet is sold in (ROADMAP §6-15).
 *
 * Each row is one purchasable size with its own price, stock and AR files —
 * the split the data model exists for, because real dimensions are baked into
 * a `.glb` and one file cannot serve two sizes.
 *
 * Dimensions are fixed once added. `VariantUpdate` accepts only price and
 * stock, and it should: changing a size in place would leave AR assets built
 * for the old one, and order lines that copied it. Getting a size wrong means
 * deleting it and adding the right one, which is honest about what actually
 * has to happen.
 */

const cellInput =
  "h-11 w-full rounded-md border border-line-2 bg-white/[0.04] px-3 text-base text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none";

function AddRow({ carpetId, onDone }: { carpetId: number; onDone: () => void }) {
  const [width, setWidth] = React.useState("");
  const [length, setLength] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [stock, setStock] = React.useState("1");
  const [failure, setFailure] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: () =>
      addVariant(carpetId, {
        width_cm: Number(width),
        length_cm: Number(length),
        price,
        stock: Number(stock) || 0,
      }),
    onMutate: () => setFailure(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.carpet(carpetId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      onDone();
    },
    onError: (error) =>
      setFailure(error instanceof ApiError ? error.message : "افزودن سایز انجام نشد."),
  });

  const valid = Number(width) >= 30 && Number(length) >= 30 && price.trim() !== "";

  return (
    <div className="rounded-lg border border-line-2 bg-white/[0.03] p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className="panel-label">عرض (سانتی‌متر)</span>
          <input
            className={cellInput}
            inputMode="numeric"
            value={width}
            onChange={(e) => setWidth(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="panel-label">طول (سانتی‌متر)</span>
          <input
            className={cellInput}
            inputMode="numeric"
            value={length}
            onChange={(e) => setLength(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
        {/* Grouped as it is typed. Nine digits with nothing between them is a
            figure that can only be checked by counting zeros — see
            `MoneyInput`, which owns the punctuation and hands back digits. */}
        <label className="flex flex-col gap-1.5">
          <span className="panel-label">قیمت (تومان)</span>
          <MoneyInput className={cellInput} value={price} onValueChange={setPrice} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="panel-label">موجودی</span>
          <input
            className={cellInput}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>
      </div>

      {failure && (
        <p role="alert" className="mt-3 text-[12.5px] leading-loose text-destructive">
          {failure}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => add.mutate()}
          disabled={!valid || add.isPending}
          className="flex h-11 items-center gap-2 rounded-full bg-cta px-5 text-[13.5px] text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover disabled:opacity-50"
        >
          {add.isPending && <Loader2 className="size-4 animate-spin" />}
          افزودن
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-11 rounded-full px-5 text-[13.5px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
        >
          انصراف
        </button>
      </div>
    </div>
  );
}

function VariantRow({ carpetId, variant }: { carpetId: number; variant: VariantOut }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  // `tomanDigits`, not `String(...)`: this field arrives as a decimal string
  // and Postgres is free to write five hundred thousand as «5.0E+5», which the
  // box would have shown verbatim.
  const [price, setPrice] = React.useState(() => tomanDigits(variant.price));
  const [stock, setStock] = React.useState(String(variant.stock));
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.carpet(carpetId) });
    queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
  };

  const save = useMutation({
    mutationFn: () => updateVariant(variant.id, { price, stock: Number(stock) || 0 }),
    onSuccess: () => {
      refresh();
      setEditing(false);
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteVariant(variant.id),
    onSuccess: refresh,
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[14px]">{formatSize(variant.width_cm, variant.length_cm)}</p>
        {!editing && (
          <p className="mt-0.5 text-[13px] text-muted">
            {formatToman(variant.price)} · موجودی {formatNumber(variant.stock)}
          </p>
        )}
      </div>

      {editing ? (
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <label className="flex flex-1 flex-col gap-1.5 sm:w-40 sm:flex-none">
            <span className="panel-label">قیمت</span>
            <MoneyInput className={cellInput} value={price} onValueChange={setPrice} />
          </label>
          <label className="flex w-24 flex-col gap-1.5">
            <span className="panel-label">موجودی</span>
            <input
              className={cellInput}
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            aria-label="ذخیره"
            className="grid size-11 place-items-center rounded-full bg-cta text-on-cta disabled:opacity-60"
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setPrice(tomanDigits(variant.price));
              setStock(String(variant.stock));
              setEditing(false);
            }}
            aria-label="انصراف"
            className="grid size-11 place-items-center rounded-full text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-11 rounded-full px-4 text-[13px] text-ink-2 transition-colors duration-[--dur-feedback] hover:text-ink"
          >
            ویرایش
          </button>

          {/* Two presses, not a browser `confirm()`. Deleting a size is the one
              destructive act on this screen, and the second press is where the
              consequence is spelled out. */}
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="flex h-11 items-center gap-1.5 rounded-full border border-status-cancelled/40 px-4 text-[13px] text-status-cancelled disabled:opacity-60"
            >
              {remove.isPending && <Loader2 className="size-3.5 animate-spin" />}
              مطمئنم، حذف کن
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={`حذف سایز ${formatSize(variant.width_cm, variant.length_cm)}`}
              className="grid size-11 place-items-center rounded-full text-muted transition-colors duration-[--dur-feedback] hover:text-status-cancelled"
            >
              <Trash2 className="size-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function VariantEditor({ carpet }: { carpet: AdminCarpetDetail }) {
  const reduced = useReducedMotion();
  const [adding, setAdding] = React.useState(false);

  const sorted = [...carpet.variants].sort(
    (a, b) => a.width_cm * a.length_cm - b.width_cm * b.length_cm,
  );

  return (
    <div className="glass rounded-xl p-5 shadow-panel sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-medium">
          سایزها
          <span className="ms-2 text-[13px] font-normal text-muted">
            {formatNumber(sorted.length)}
          </span>
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-11 items-center gap-1.5 rounded-full border border-line-2 px-4 text-[13.5px] transition-colors duration-[--dur-feedback] hover:border-line"
          >
            <Plus className="size-4" strokeWidth={2} />
            سایز تازه
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.34, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <AddRow carpetId={carpet.id} onDone={() => setAdding(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sorted.length === 0 ? (
        <p className={cn("text-[13.5px] leading-loose text-muted", adding ? "mt-4" : "mt-4")}>
          هنوز سایزی ثبت نشده. تا سایز نباشد، فرش نه در فروشگاه قیمت دارد و نه فایل AR می‌گیرد.
        </p>
      ) : (
        <ul className="mt-2">
          {sorted.map((variant) => (
            <VariantRow key={variant.id} carpetId={carpet.id} variant={variant} />
          ))}
        </ul>
      )}
    </div>
  );
}
