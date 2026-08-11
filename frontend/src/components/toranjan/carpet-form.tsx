"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCarpetDetail, CarpetMaterial, CarpetPattern, RoomType } from "@/lib/api/types";
import { MATERIAL_LABEL, PATTERN_LABEL, ROOM_LABEL } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * The fields a carpet is described by — one form for both «new» and «edit».
 *
 * The schema restates the backend's rules rather than trusting the round trip:
 * same lengths, same slug pattern, same eight-colour ceiling. A field that
 * would be rejected server-side says so beside itself before anything is sent
 * (§8), and the two agreeing is checked by the fact that both are written from
 * `app/schemas/admin.py`.
 *
 * **The slug is only offered when creating.** The backend has no rename path —
 * `CarpetUpdate` has no `slug` — and a field that silently does nothing is
 * worse than one that is absent. On edit it is shown as text, because it is
 * what the shop's URL is built from and the shopkeeper should be able to read
 * it.
 */

const SLUG = /^[a-z0-9-]+$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * One reading of the colour field, used by both the validator and the submit
 * handler — because when they disagreed the form stopped working.
 *
 * Both commas are accepted: «،» is what the Persian keyboard produces, and the
 * field is pre-filled with it, so refusing it would mean rejecting the exact
 * text the form itself wrote.
 */
function splitColors(value: string): string[] {
  return value
    .split(/[,،]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

const schema = z.object({
  slug: z
    .string()
    .min(3, "دست‌کم ۳ نویسه")
    .max(120)
    .regex(SLUG, "فقط حروف کوچک انگلیسی، عدد و خط تیره"),
  name: z.string().min(2, "نام فرش را بنویسید").max(200),
  description: z.string().max(5000).optional(),
  pattern: z.string().min(1, "طرح را انتخاب کنید"),
  material: z.string().min(1, "جنس را انتخاب کنید"),
  origin: z.string().max(100).optional(),
  colors: z
    .string()
    .optional()
    // Split on either comma, exactly as the submit handler does.
    //
    // These disagreed, and the disagreement broke the whole form: the field is
    // *filled* by joining with «،» because that is what a Persian keyboard
    // produces, while this split on `,` alone — so a carpet with two colours
    // arrived as one unparseable string, failed the pattern, and blocked
    // submitting. Nothing appeared to happen when «ذخیره» was pressed, because
    // the error was attached to a field nobody had touched.
    .refine(
      (value) => !value || splitColors(value).every((c) => HEX.test(c)),
      "هر رنگ باید مثل ‎#a16207 باشد",
    )
    .refine((value) => !value || splitColors(value).length <= 8, "حداکثر ۸ رنگ"),
});

export type CarpetFormValues = z.infer<typeof schema>;

export interface CarpetFormResult {
  slug: string;
  name: string;
  description: string | null;
  pattern: CarpetPattern;
  material: CarpetMaterial;
  origin: string | null;
  colors: string[];
  suitable_rooms: RoomType[];
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13.5px] text-ink-2">{label}</label>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] leading-loose text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] leading-loose text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const selectClass =
  "h-12 w-full rounded-md border border-line-2 bg-white/[0.04] px-3 text-base text-ink focus:border-accent/50 focus:outline-none";

export interface CarpetFieldError {
  field: keyof CarpetFormValues;
  message: string;
}

export function CarpetForm({
  carpet,
  submitting,
  submitLabel,
  fieldError,
  formId,
  hideSubmit = false,
  onSubmit,
}: {
  carpet?: AdminCarpetDetail;
  submitting?: boolean;
  submitLabel: string;
  /** A rejection the server made that belongs to one field — a taken slug. */
  fieldError?: CarpetFieldError | null;
  /**
   * Names the `<form>` so a submit button can live outside it.
   *
   * HTML's own `form` attribute is what makes that legal: a button anywhere in
   * the document submits the form it names. The edit screen needs it because
   * this form is only the *first* of three panels, and its save button belongs
   * at the bottom of the page rather than in the middle of it.
   */
  formId?: string;
  /** For pages that render the submit button themselves, at page level. */
  hideSubmit?: boolean;
  onSubmit: (values: CarpetFormResult) => void;
}) {
  const editing = Boolean(carpet);

  const [rooms, setRooms] = React.useState<RoomType[]>(carpet?.suitable_rooms ?? []);

  const form = useForm<CarpetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: carpet?.slug ?? "",
      name: carpet?.name ?? "",
      description: carpet?.description ?? "",
      pattern: carpet?.pattern ?? "",
      material: carpet?.material ?? "",
      origin: carpet?.origin ?? "",
      colors: (carpet?.colors ?? []).join("، "),
    },
  });

  // A server rejection that names a field belongs *on* that field. «این شناسه
  // قبلاً استفاده شده» is about the slug box and nothing else, so it is shown
  // there — where the correction is made (§8) — and react-hook-form clears it
  // the moment the box is edited. That is also why it does not need dismissing:
  // it goes away by being fixed.
  const { setError } = form;
  React.useEffect(() => {
    if (fieldError) setError(fieldError.field, { message: fieldError.message });
  }, [fieldError, setError]);

  const submit = form.handleSubmit((values) => {
    onSubmit({
      slug: values.slug,
      name: values.name,
      description: values.description?.trim() ? values.description.trim() : null,
      pattern: values.pattern as CarpetPattern,
      material: values.material as CarpetMaterial,
      origin: values.origin?.trim() ? values.origin.trim() : null,
      colors: splitColors(values.colors ?? "").map((c) => c.toLowerCase()),
      suitable_rooms: rooms,
    });
  });

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="نام فرش" error={form.formState.errors.name?.message}>
          <Input
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
        </Field>

        {editing ? (
          <Field label="شناسه‌ی نشانی (slug)" hint="پس از ساخت تغییر نمی‌کند.">
            <p
              dir="ltr"
              className="flex h-12 items-center rounded-md border border-line bg-white/[0.02] px-3 font-figure text-[14px] text-muted"
            >
              {carpet?.slug}
            </p>
          </Field>
        ) : (
          <Field
            label="شناسه‌ی نشانی (slug)"
            error={form.formState.errors.slug?.message}
            hint="در نشانی فرش می‌آید و بعداً عوض نمی‌شود."
          >
            <Input
              dir="ltr"
              className="text-start font-figure"
              placeholder="kashan-red"
              aria-invalid={Boolean(form.formState.errors.slug)}
              {...form.register("slug")}
            />
          </Field>
        )}

        <Field label="طرح" error={form.formState.errors.pattern?.message}>
          <select
            className={selectClass}
            aria-invalid={Boolean(form.formState.errors.pattern)}
            {...form.register("pattern")}
          >
            <option value="">انتخاب کنید…</option>
            {Object.entries(PATTERN_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="جنس" error={form.formState.errors.material?.message}>
          <select
            className={selectClass}
            aria-invalid={Boolean(form.formState.errors.material)}
            {...form.register("material")}
          >
            <option value="">انتخاب کنید…</option>
            {Object.entries(MATERIAL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="شهر یا منشأ"
          error={form.formState.errors.origin?.message}
          hint="اختیاری — مثل کاشان یا تبریز."
        >
          <Input {...form.register("origin")} />
        </Field>

        <Field
          label="رنگ‌های غالب"
          error={form.formState.errors.colors?.message}
          hint="اختیاری. با ویرگول جدا کنید. اگر خالی بماند از نخستین عکس استخراج می‌شود."
        >
          <Input
            dir="ltr"
            className="text-start font-figure"
            placeholder="#8b1e1e, #f0e0c0"
            aria-invalid={Boolean(form.formState.errors.colors)}
            {...form.register("colors")}
          />
        </Field>
      </div>

      <Field label="توضیح" error={form.formState.errors.description?.message}>
        <Textarea rows={4} {...form.register("description")} />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-[13.5px] text-ink-2">مناسب برای</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROOM_LABEL).map(([value, label]) => {
            const room = value as RoomType;
            const on = rooms.includes(room);
            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setRooms((prev) =>
                    prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room],
                  )
                }
                aria-pressed={on}
                className={cn(
                  "h-11 rounded-full border px-4 text-[13.5px] transition-colors duration-[--dur-feedback]",
                  on
                    ? "border-accent/50 bg-accent/12 text-accent"
                    : "border-line-2 text-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pinned to the bottom of the viewport while the form is on screen.

          `sticky`, not `fixed`, for the reason the shop already recorded: a
          fixed bar sits on top of whatever the page ends with, and the usual
          cure is padding the body by a height that changes with its contents.

          The negative margins let the bar's ground run to the panel's edges
          while the button stays on the form's own alignment.

          Not rendered when the page places the button itself — on the edit
          screen this form is the first of three panels, and a save bar pinned
          inside it stops being reachable exactly where the work continues. */}
      {!hideSubmit && (
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-1 border-t border-line bg-paper/80 px-5 py-4 backdrop-blur-sm sm:-mx-6 sm:-mb-6 sm:px-6">
          <CarpetSubmit submitting={submitting} label={submitLabel} />
        </div>
      )}
    </form>
  );
}

/**
 * The save button, so the page and the form draw the same one.
 *
 * `form` is set by the caller when it renders this outside the `<form>`; inside
 * it, the attribute is unnecessary and harmless.
 */
export function CarpetSubmit({
  submitting,
  label,
  formId,
}: {
  submitting?: boolean;
  label: string;
  formId?: string;
}) {
  return (
    <button
      type="submit"
      form={formId}
      disabled={submitting}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta px-6 text-[14px] text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover disabled:opacity-60 sm:w-fit"
    >
      {submitting && <Loader2 className="size-4 animate-spin" />}
      {label}
    </button>
  );
}
