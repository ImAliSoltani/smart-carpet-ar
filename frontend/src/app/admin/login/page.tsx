"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/admin";

/**
 * The way in (ROADMAP §4 — one admin, password in `.env`, HttpOnly session).
 *
 * Deliberately plain. There is no «forgot password» because there is nobody to
 * mail it to, and no «create account» because there is exactly one account.
 *
 * The failure text says only that the pair was wrong — never which half. The
 * backend answers that way too, and it is the difference between a stranger
 * learning nothing and learning that a username exists.
 */

const schema = z.object({
  username: z.string().min(1, "نام کاربری را وارد کنید"),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

type LoginValues = z.infer<typeof schema>;

/** Only inside this app, and only a path — never an absolute URL. */
function safeNext(value: string | null): string {
  if (!value) return "/admin";
  // `//evil.example` is a protocol-relative URL that a browser will happily
  // treat as another origin, so «starts with a slash» is not enough on its own.
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value.startsWith("/admin") ? value : "/admin";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [failure, setFailure] = React.useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await login(values.username, values.password);
      // `replace`, so the back button does not return to a form that has
      // already been used.
      router.replace(next);
    } catch (error) {
      setFailure(
        error instanceof ApiError ? error.message : "ورود انجام نشد. دوباره تلاش کنید.",
      );
      form.resetField("password");
      form.setFocus("password");
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div>
        <label htmlFor="username" className="mb-2 block text-[13px] text-muted">
          نام کاربری
        </label>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          dir="ltr"
          className="text-start"
          aria-invalid={Boolean(form.formState.errors.username)}
          {...form.register("username")}
        />
        {form.formState.errors.username && (
          <p role="alert" className="mt-2 text-[12.5px] leading-loose text-destructive">
            {form.formState.errors.username.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-[13px] text-muted">
          رمز عبور
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          className="text-start"
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p role="alert" className="mt-2 text-[12.5px] leading-loose text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      {/* `role="alert"` so a reader that has already moved past the fields is
          told the attempt failed, rather than finding out by tabbing back. */}
      {failure && (
        <p role="alert" className="rounded-md border border-line bg-paper p-4 text-[13px] leading-loose">
          {failure}
        </p>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 rounded-full">
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            در حال ورود…
          </>
        ) : (
          "ورود"
        )}
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight">ترنجان</p>
          <p className="mt-2 text-[13px] tracking-[0.14em] text-muted">پنل مدیریت</p>
        </div>

        <div className="rounded-xl border border-line bg-paper p-6 shadow-panel sm:p-8">
          {/* `useSearchParams` opts the tree into client rendering, and Next
              wants the boundary named rather than inferred. */}
          <React.Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-line" />}>
            <LoginForm />
          </React.Suspense>
        </div>
      </div>
    </main>
  );
}
