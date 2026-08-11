"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import {
  CarpetForm,
  type CarpetFieldError,
  type CarpetFormResult,
} from "@/components/toranjan/carpet-form";
import { ENTER, GoldRule } from "@/components/toranjan/admin-motion";
import { useToast } from "@/components/toranjan/admin-toast";
import { adminKeys, createCarpet } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";

/**
 * Adding a carpet (ROADMAP §6-15).
 *
 * Only the description. Sizes and photographs come after, on the edit screen,
 * and that ordering is the backend's rather than a preference: a variant needs
 * a `carpet_id` and an upload needs one too, so neither can exist until the
 * carpet does. Asking for all three at once would mean holding files in the
 * browser through a request that might fail.
 */
export function NewCarpet() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { show } = useToast();
  const [fieldError, setFieldError] = React.useState<CarpetFieldError | null>(null);

  const create = useMutation({
    mutationFn: (values: CarpetFormResult) => createCarpet(values),
    onMutate: () => setFieldError(null),
    onSuccess: (carpet) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      // Named, not «موفق». The page is about to change under them, and the
      // useful sentence is the one that says what is still missing.
      show(`«${carpet.name}» ثبت شد. حالا سایز و عکس اضافه کنید.`);
      // Straight on to the screen where its sizes and photographs go, because
      // a carpet with neither is not yet sellable.
      router.replace(`/admin/carpets/${carpet.id}`);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "ثبت فرش انجام نشد.";
      // 409 is the one rejection that names a field: the slug is taken. It goes
      // on the slug box, where it clears itself as soon as the box is edited,
      // rather than sitting at the bottom of the panel as a notice to close.
      if (error instanceof ApiError && error.status === 409) {
        setFieldError({ field: "slug", message });
      }
      show(message, "failure");
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/carpets"
        className="-ms-3 inline-flex h-11 w-fit items-center gap-1.5 px-3 text-[13.5px] text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
      >
        <ArrowRight className="size-4" strokeWidth={1.5} />
        فرش‌ها
      </Link>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ENTER}
        className="glass relative rounded-xl p-5 shadow-panel sm:p-6"
      >
        <GoldRule delay={0.15} />
        <h2 className="mb-1 text-[16px] font-medium">فرش تازه</h2>
        <p className="mb-6 text-[13.5px] leading-loose text-muted">
          اول مشخصات. بعد از ثبت، سایزها و عکس‌ها را در همین فرش اضافه می‌کنید.
        </p>

        <CarpetForm
          submitLabel="ثبت فرش"
          submitting={create.isPending}
          fieldError={fieldError}
          onSubmit={(values) => create.mutate(values)}
        />
      </motion.div>
    </div>
  );
}
