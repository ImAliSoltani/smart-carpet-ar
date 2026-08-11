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
    <div data-surface="admin" className="admin-ground flex min-h-dvh">
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
      {/* **The rail is the sticky element itself, not its child.** It was the
          child, and it silently did not stick: `overflow-hidden` — which this
          element needs, so the fixed-width contents are clipped as the width
          animates to zero — makes the nearest scrollport for anything inside
          it, and `position: sticky` has nothing left to stick to. Measured:
          after scrolling 700px the logout button had travelled from y=849 to
          y=149, i.e. straight up the page with the content.
          `self-start` is the other half — a flex child stretches to the row's
          full height by default, and an element as tall as the whole document
          cannot stick to anything either. */}
      <motion.aside
        className="glass sticky top-0 hidden h-dvh shrink-0 self-start overflow-hidden border-y-0 border-e-0 md:block"
        initial={false}
        // Width and opacity only. The border needs no separate treatment — it
        // fades with everything else — and the logical `border-s` has no
        // animatable counterpart that is not the physical left or right, which
        // would be the wrong edge in half the world.
        animate={{ width: railOpen ? 248 : 0, opacity: railOpen ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.46, ease: EASE_OUT }}
      >
        <div className="flex h-full w-[248px] flex-col">
          <div className="flex h-14 items-center px-5">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center text-[17px] font-semibold tracking-tight"
            >
              ترنجان
              {/* No tracking. It is Persian, and letter-spacing pushes apart
                  letters that are meant to be joined — the wordmark's own
                  TORANJAN keeps its tracking because that one is Latin. */}
              <span className="ms-2 text-[12.5px] font-normal text-muted">مدیریت</span>
            </Link>
          </div>
          <AdminNav onSignOut={signOut.mutate} signingOut={signOut.isPending} />
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-x-0 border-t-0 px-4 sm:px-6">
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
              {/* `data-surface` has to be repeated *here*, on the panel
                  itself. Radix portals its content to `document.body`, which
                  is outside the element carrying the admin tokens — so every
                  dark value fell back to the shop's light one and the drawer
                  came out white with `bg-paper` resolving to #ffffff. The
                  glass rules match the same element as well as a descendant
                  for exactly this case. */}
              <SheetContent
                title="منوی مدیریت"
                data-surface="admin"
                // `glass-overlay`, not `glass`: this one covers the page's own
                // text rather than a photograph, and at the card's density the
                // two layers of type read through each other.
                className="glass-overlay flex w-[276px] flex-col border-y-0 p-0 text-ink"
              >
                <AdminNav
                  onNavigate={() => setDrawerOpen(false)}
                  onSignOut={signOut.mutate}
                  signingOut={signOut.isPending}
                  layoutGroup="drawer"
                />
              </SheetContent>
            </Sheet>

            <h1 className="truncate text-[16px] font-medium">{title}</h1>
          </div>

          <span className="hidden truncate text-[13.5px] text-ink-2 sm:block">
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
          {/* **No `initial={false}` here, and that was the bug.** It reads like
              it only suppresses this wrapper's own first entrance, but framer
              publishes it on the presence context and every descendant
              `motion` element reads it — so on the first load of the panel the
              counters and every table row skipped their entrance and were
              simply *there*. The staggered arrival only ever played on a
              second navigation, which is the one time nobody is watching for
              it. */}
          <AnimatePresence>
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
