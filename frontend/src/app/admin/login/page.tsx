"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/admin";
import { formatClock } from "@/lib/format";

/**
 * The way in (ROADMAP §4 — one admin, password in `.env`, HttpOnly session).
 *
 * Deliberately plain in what it *asks*. There is no «forgot password»
 * because there is nobody to mail it to, and no «create account» because
 * there is exactly one account.
 *
 * The failure text says only that the pair was wrong — never which half. The
 * backend answers that way too, and it is the difference between a stranger
 * learning nothing and learning that a username exists.
 *
 * What it is *not* plain in is the standing. The page dropped the panel's
 * photograph for the panel's own dark with gold drifting across it; the
 * styling lives under «THE PANEL'S DOOR» in `globals.css`, including why
 * this is the one screen where the gold is allowed to be large.
 */

const schema = z.object({
  username: z.string().min(1, "نام کاربری را وارد کنید"),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

type LoginValues = z.infer<typeof schema>;

/** How long the accepted state is held before the panel replaces it. */
const HANDOVER_MS = 2000;
/** Slightly longer than the 550ms shake, so it is never cut mid-swing. */
const REFUSE_MS = 600;

/** Only inside this app, and only a path — never an absolute URL. */
function safeNext(value: string | null): string {
  if (!value) return "/admin";
  // `//evil.example` is a protocol-relative URL that a browser will happily
  // treat as another origin, so «starts with a slash» is not enough on its own.
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  return value.startsWith("/admin") ? value : "/admin";
}

/**
 * The tick is drawn rather than faded in, the same way the shop's cart
 * confirmation draws one: a stroke that completes reads as «this finished»,
 * where an icon that simply appears reads as «an icon appeared».
 * `pathLength={1}` normalises the dash maths against the shared keyframe.
 */
function DrawnCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-9"
      aria-hidden
    >
      <path
        d="M4.5 12.6 9.6 17.7 19.5 6.9"
        pathLength={1}
        strokeDasharray={1}
        // Always the drawn end state; the keyframe supplies the undrawn start,
        // so reduced motion — which collapses the keyframe — still lands on a
        // finished tick rather than on nothing.
        strokeDashoffset={0}
        style={{ animation: "toranjan-draw 450ms cubic-bezier(0.16, 1, 0.3, 1) 350ms both" }}
      />
    </svg>
  );
}

/**
 * The lockout clock.
 *
 * Counts against `Date.now()` rather than by subtracting one per tick, and
 * that is the whole reason it is a component of its own. A counter that
 * decrements on an interval drifts — `setInterval` is throttled hard in a
 * background tab and stops entirely when the machine sleeps — so a lock the
 * server will lift in five minutes could still read «۰۳:۱۲» ten minutes later,
 * which is worse than showing nothing: it is a promise the page cannot keep.
 * Reading the wall clock every tick means a tab that was asleep comes back
 * with the right number, or with none.
 *
 * The interval is 500ms, not 1000ms. Ticking at exactly the rate the display
 * changes means every tick lands somewhere inside a second and the visible
 * digit skips one about as often as not; sampling twice as fast as the thing
 * being shown is the cheapest fix and costs one extra `Date.now()` a second.
 *
 * `aria-hidden`, deliberately. A live region that re-announces every second
 * would make this card unusable with a screen reader, and the sentence beside
 * it already says the thing that matters — that login is closed for now.
 */
function LockClock({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = React.useState(seconds);

  React.useEffect(() => {
    // The deadline is pinned here and not where the 429 was caught, because an
    // effect is the one place a component may read the wall clock: `Date.now()`
    // during render is an impure call, and React's own lint rule says so. The
    // cost of moving it is a single frame between the response arriving and the
    // clock starting, which no one can see.
    const deadline = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const left = (deadline - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) onExpire();
    }, 500);
    return () => clearInterval(id);
  }, [seconds, onExpire]);

  return (
    <span className="admin-auth-clock tabular-nums" dir="ltr" aria-hidden>
      {formatClock(remaining)}
    </span>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [failure, setFailure] = React.useState<string | null>(null);
  const [refusing, setRefusing] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  /** Seconds the server said to wait, straight from `Retry-After`, or `null`. */
  const [lockedFor, setLockedFor] = React.useState<number | null>(null);

  // Both delays hang off the state that causes them rather than off the
  // submit handler, so each one is cleaned up by the effect that started it.
  // The refusal timer in particular can still be pending when a second
  // attempt succeeds, and a `setState` landing after that unmount is a
  // warning at best.
  React.useEffect(() => {
    if (!accepted) return;
    const t = setTimeout(() => router.replace(next), HANDOVER_MS);
    return () => clearTimeout(t);
  }, [accepted, router, next]);

  // The shake has to be taken off again, or a second wrong password never
  // replays it: the class is already there, so nothing changes and the
  // browser has no reason to restart the animation.
  React.useEffect(() => {
    if (!refusing) return;
    const t = setTimeout(() => setRefusing(false), REFUSE_MS);
    return () => clearTimeout(t);
  }, [refusing]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  // The lock lifting is the one state change nobody on this page asked for, so
  // it clears the message with it. Leaving «ورود موقتاً بسته شده است» on screen
  // beside an enabled button would be the page contradicting itself.
  const unlock = React.useCallback(() => {
    setLockedFor(null);
    setFailure(null);
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      await login(values.username, values.password);
      // The accepted state is a beat, not a screen: it says the pair was
      // right before the panel's own loading begins, so the wait that
      // follows reads as «coming» rather than as «still trying». The
      // effect above turns it into the `replace` that leaves this page.
      setAccepted(true);
    } catch (error) {
      setFailure(
        error instanceof ApiError ? error.message : "ورود انجام نشد. دوباره تلاش کنید.",
      );
      // A 429 carries the seconds left in `Retry-After`. Only a 429 *with* the
      // header locks the page: without a number there is nothing to count down
      // to, and a disabled button with no visible end is worse than a message.
      if (error instanceof ApiError && error.status === 429 && error.retryAfter) {
        setLockedFor(error.retryAfter);
      }
      setRefusing(true);
      form.resetField("password");
      form.setFocus("password");
    }
  });

  const locked = lockedFor !== null;
  const busy = form.formState.isSubmitting || accepted || locked;

  if (accepted) {
    return (
      <div className="admin-auth-step-in text-center" aria-live="polite">
        <div className="relative mx-auto mb-6 grid size-24 place-items-center">
          <span
            className="admin-auth-done-ring absolute inset-0 rounded-full border-2"
            style={{ borderColor: "rgba(74, 222, 128, 0.4)" }}
            aria-hidden
          />
          <span
            className="admin-auth-done-disc grid size-20 place-items-center rounded-full border-2"
            style={{
              borderColor: "var(--status-confirmed)",
              backgroundColor: "rgba(74, 222, 128, 0.14)",
              color: "var(--status-confirmed)",
            }}
            aria-hidden
          >
            <DrawnCheck />
          </span>
        </div>
        <p className="text-xl font-semibold" style={{ color: "var(--status-confirmed)" }}>
          خوش آمدید
        </p>
        <p className="mt-2 text-[13px] leading-loose text-ink-2">
          در حال باز کردن پنل مدیریت…
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={refusing ? "admin-auth-refuse flex flex-col gap-5" : "flex flex-col gap-5"}
      noValidate
    >
      <div>
        <label htmlFor="username" className="mb-2 block text-[13px] text-ink-2">
          نام کاربری
        </label>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          dir="ltr"
          className="admin-auth-field text-start"
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
        <label htmlFor="password" className="mb-2 block text-[13px] text-ink-2">
          رمز عبور
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          className="admin-auth-field text-start"
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
          told the attempt failed, rather than finding out by tabbing back.

          A lockout is not the same kind of failure as a wrong password and does
          not look like one. Red says «you got it wrong, try again», which is
          exactly the thing that is no longer possible; this is the gold the
          page is already made of, and it says «wait». */}
      {failure && (
        <div
          role="alert"
          className={
            locked
              ? "admin-auth-lock rounded-xl p-4 text-center"
              : "rounded-md border border-destructive/40 bg-destructive/10 p-4 text-[13px] leading-loose"
          }
        >
          {lockedFor !== null ? (
            <>
              <div className="flex items-center justify-center gap-2 text-[13px] leading-loose">
                <ShieldAlert className="size-4 shrink-0 text-accent-strong" aria-hidden />
                <span>{failure}</span>
              </div>
              <LockClock seconds={lockedFor} onExpire={unlock} />
              <p className="text-[12.5px] text-ink-2">تا باز شدن دوباره‌ی ورود</p>
            </>
          ) : (
            failure
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={busy}
        className="admin-auth-submit h-12 rounded-full text-[15px] font-semibold"
      >
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            در حال ورود…
          </>
        ) : locked ? (
          "ورود بسته است"
        ) : (
          "ورود"
        )}
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main
      data-surface="admin"
      className="relative grid min-h-dvh place-items-center px-5 py-12"
    >
      {/* The ground, as its own fixed layer rather than as the page's
          background: the orbs need something to be positioned inside and
          something to be clipped by, and both have to sit behind the card
          without a negative z-index — a negative-z child paints behind its
          own parent's background, which is how the panel's photograph was
          lost the first time (see `admin-ground` in `globals.css`). */}
      <div className="admin-auth-ground" aria-hidden="true">
        <span className="admin-auth-pools" />
        <span className="admin-auth-orb admin-auth-orb-1" />
        <span className="admin-auth-orb admin-auth-orb-2" />
        <span className="admin-auth-orb admin-auth-orb-3" />
        <span className="admin-auth-grid" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <span
            className="admin-auth-halo grid size-14 place-items-center rounded-2xl border"
            style={{
              borderColor: "rgba(217, 168, 66, 0.32)",
              backgroundColor: "rgba(217, 168, 66, 0.1)",
            }}
            aria-hidden
          >
            <Lock className="size-7 text-accent-strong" strokeWidth={1.5} />
          </span>
        </div>

        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight">ترنجان</p>
          <p className="mt-2 text-[13px] text-ink-2">پنل مدیریت</p>
        </div>

        <div className="glass-strong admin-auth-card rounded-2xl p-6 sm:p-8">
          {/* `useSearchParams` opts the tree into client rendering, and Next
              wants the boundary named rather than inferred. */}
          <React.Suspense
            fallback={<div className="h-64 animate-pulse rounded-md bg-white/5" />}
          >
            <LoginForm />
          </React.Suspense>
        </div>
      </div>
    </main>
  );
}
