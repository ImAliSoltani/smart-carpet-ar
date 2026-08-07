"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, PanelRightClose, PanelRightOpen } from "lucide-react";

import { AdminNav, useAdminTitle } from "@/components/toranjan/admin-nav";
import { EASE_OUT } from "@/components/toranjan/admin-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { adminKeys, isUnauthorized, logout, meQuery } from "@/lib/api/admin";

/**
 * The frame every admin page sits in (ROADMAP §6-14).
 *
 * The 21st shell put its own chrome around itself — a rounded card floating in
 * a centred viewport, which is a screenshot of an app rather than an app. Here
 * the shell *is* the page: it fills the window, the rail is on the reading edge,
 * and the top bar carries the one line saying where you are.
 *
 * **The gate is a fact, not a guard.** Nothing here is security — the API
 * refuses every unauthenticated call on its own, and a panel that only hid its
 * buttons would still be wide open. This exists so a signed-out visitor gets
 * the login page instead of four failed requests and an error.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const title = useAdminTitle();
  const reduced = useReducedMotion();

  const [railOpen, setRailOpen] = React.useState(true);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const session = useQuery(meQuery());

  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Cleared either way. A failed logout still means this browser should
      // stop showing what it cached of somebody's shop.
      queryClient.removeQueries({ queryKey: adminKeys.all });
      router.replace("/admin/login");
    },
  });

  React.useEffect(() => {
    if (isUnauthorized(session.error)) {
      // `replace`, not `push`: pressing back from the login page should not
      // land on a panel that is going to bounce straight back here.
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [session.error, pathname, router]);

  if (session.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg">
        <div className="h-24 w-56 animate-pulse rounded-xl border border-line bg-paper" aria-hidden />
        <span className="sr-only">در حال بررسی نشست</span>
      </div>
    );
  }

  if (session.error) {
    // Unauthorized is already on its way to the login page; anything else is a
    // real failure and says so rather than redirecting into a loop.
    if (isUnauthorized(session.error)) return null;
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6">
        <p className="max-w-sm rounded-md border border-line bg-paper p-6 text-center text-sm leading-loose">
          {session.error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* The rail, from `md` up. It collapses to nothing rather than to a strip
          of icons: four destinations named in Persian do not survive being cut
          to their first letter.

          **This was the stiff one, and the cause was a typo.** It asked for
          `duration-[--dur-enter]`; the token is `--dur-entrance`, so the
          declaration was invalid, the duration fell back to zero and the rail
          snapped shut with no animation at all. It is a motion value now rather
          than a class, which also lets the width and the fade share one curve —
          the panel slides out from under its own edge instead of the contents
          reflowing as the box narrows. */}
      <motion.aside
        className="hidden shrink-0 overflow-hidden border-s border-line bg-bg md:block"
        initial={false}
        // Width and opacity only. The border needs no separate treatment — it
        // fades with everything else — and the logical `border-s` has no
        // animatable counterpart that is not the physical left or right, which
        // would be the wrong edge in half the world.
        animate={{ width: railOpen ? 248 : 0, opacity: railOpen ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.46, ease: EASE_OUT }}
      >
        <div className="sticky top-0 flex h-dvh w-[248px] flex-col">
          <div className="flex h-14 items-center px-5">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center text-[17px] font-semibold tracking-tight"
            >
              ترنجان
              <span className="ms-2 text-[11px] font-normal tracking-[0.14em] text-muted">
                مدیریت
              </span>
            </Link>
          </div>
          <AdminNav onSignOut={signOut.mutate} signingOut={signOut.isPending} />
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              aria-label={railOpen ? "بستن ستون کناری" : "باز کردن ستون کناری"}
              aria-expanded={railOpen}
              className="hidden size-11 place-items-center rounded-md text-muted transition-colors duration-[--dur-feedback] hover:text-ink md:grid"
            >
              {railOpen ? (
                <PanelRightClose className="size-[18px]" strokeWidth={1.5} />
              ) : (
                <PanelRightOpen className="size-[18px]" strokeWidth={1.5} />
              )}
            </button>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="منوی مدیریت"
                  className="grid size-11 place-items-center rounded-md text-muted transition-colors duration-[--dur-feedback] hover:text-ink md:hidden"
                >
                  <Menu className="size-[18px]" strokeWidth={1.5} />
                </button>
              </SheetTrigger>
              <SheetContent title="منوی مدیریت" className="w-[276px] p-0">
                <AdminNav
                  onNavigate={() => setDrawerOpen(false)}
                  onSignOut={signOut.mutate}
                  signingOut={signOut.isPending}
                  layoutGroup="drawer"
                />
              </SheetContent>
            </Sheet>

            <h1 className="truncate text-[15px] font-medium">{title}</h1>
          </div>

          <span className="hidden truncate text-[13px] text-muted sm:block">
            {session.data?.username}
          </span>
        </header>

        {/* One page gives way to the next rather than being replaced. Keyed on
            the path, so React tears the old subtree down and the new one enters
            — a rise of ten pixels, which at this duration reads as a settle
            rather than a slide. `mode="wait"` is deliberately not used: making
            the arriving page queue behind the leaving one doubles the wait on
            every navigation, and the panel is somewhere people move quickly. */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <AnimatePresence initial={false}>
            <motion.div
              key={pathname}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.42, ease: EASE_OUT }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
