"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Boxes,
  Cuboid,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Store,
} from "lucide-react";

import { EASE_OUT } from "@/components/toranjan/admin-motion";
import { statsQuery } from "@/lib/api/admin";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The panel's navigation, from 21st.dev's Dashboard Sidebar.
 *
 * Kept from it: the grouped list, the count badge riding on an item, the
 * pinned bottom group, and the quiet weight — an item is a muted label that
 * only takes ink when it is the one you are on.
 *
 * Dropped, because they describe a different product: the workspace switcher
 * (this is one shop, and «Acme Corp / Pro Plan» above a carpet catalogue is a
 * costume), the ⌘K palette (four destinations do not need search), the nested
 * children (same reason), and every `dark:` pair — the shop is light-only by a
 * decision that is already made.
 *
 * **Rewritten: every item was a `<div onClick>`.** That is not reachable by
 * keyboard, has no role, and cannot be opened in a new tab — for what is
 * literally a set of links. They are `<Link>`s now, which also means the active
 * state can come from the URL instead of from a `useState` that would forget
 * itself on every navigation.
 */

interface NavEntry {
  href: string;
  title: string;
  icon: LucideIcon;
  /** Matched as a prefix, so a child page keeps its parent lit. */
  section?: boolean;
}

const MAIN: NavEntry[] = [
  { href: "/admin", title: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/carpets", title: "فرش‌ها", icon: Boxes, section: true },
  { href: "/admin/ar", title: "بازبینی واقعیت افزوده", icon: Cuboid, section: true },
  { href: "/admin/orders", title: "سفارش‌ها", icon: Boxes, section: true },
];

function isCurrent(pathname: string, entry: NavEntry): boolean {
  if (!entry.section) return pathname === entry.href;
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}

function NavLink({
  entry,
  badge,
  onNavigate,
  layoutGroup,
}: {
  entry: NavEntry;
  badge?: number;
  onNavigate?: () => void;
  /** Distinct per instance: the rail and the drawer are both mounted at once
   *  on a tablet, and one shared id would make the card fly between them. */
  layoutGroup: string;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const current = isCurrent(pathname, entry);

  return (
    <Link
      href={entry.href}
      onClick={onNavigate}
      // `aria-current`, not just a colour. The active item is told apart by
      // weight and a wash of paper, and neither reaches a screen reader.
      aria-current={current ? "page" : undefined}
      className={cn(
        "group relative flex h-11 items-center justify-between gap-2.5 rounded-md px-3",
        "transition-colors duration-[--dur-feedback]",
        current ? "font-medium text-ink" : "text-muted hover:text-ink",
      )}
    >
      {/* The active card is one element that *moves* between items rather than
          four that switch on and off — `layoutId` is what lets framer measure
          the old position and the new one and tween between them. It is the
          single detail that makes a rail feel built rather than styled, and it
          costs one shared id.

          Behind the label (`-z-10`), so the text never inherits the transform
          and blurs mid-flight. */}
      {current && (
        <motion.span
          layoutId={layoutGroup}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-md bg-paper shadow-panel"
          transition={reduced ? { duration: 0 } : { duration: 0.42, ease: EASE_OUT }}
        >
          {/* A gold hairline on the reading edge — the accent as a mark, which
              is the only size §4 lets it be. */}
          <span className="absolute inset-y-1.5 end-0 w-px rounded-full bg-accent" />
        </motion.span>
      )}

      <span className="flex items-center gap-2.5">
        <entry.icon
          className={cn(
            "size-[17px] shrink-0 transition-colors duration-[--dur-feedback]",
            current ? "text-accent" : "text-muted group-hover:text-ink-2",
          )}
          strokeWidth={1.5}
        />
        <span className="truncate text-[13.5px]">{entry.title}</span>
      </span>

      {/* Only when there is something waiting. A badge reading «۰» is a badge
          asking to be ignored, and then the one that matters is ignored too. */}
      {badge !== undefined && badge > 0 && (
        <motion.span
          // It arrives rather than appearing. The count is fetched after the
          // rail is already drawn, so without this a badge pops into a row that
          // was settled — the one moment in the panel where something changes
          // without the eye being told.
          initial={reduced ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE_OUT }}
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-confirm-tint px-1.5 text-[11px] text-confirm-tint-ink"
        >
          {formatNumber(badge)}
        </motion.span>
      )}
    </Link>
  );
}

export function AdminNav({
  onNavigate,
  onSignOut,
  signingOut = false,
  layoutGroup = "rail",
}: {
  /** Closes the drawer on a phone; nothing on a desktop. */
  onNavigate?: () => void;
  onSignOut: () => void;
  signingOut?: boolean;
  layoutGroup?: string;
}) {
  // The badge is the only reason navigation asks for anything. It shares a key
  // with the dashboard's own copy, so moving between pages does not re-ask.
  const { data: stats } = useQuery({ ...statsQuery(), staleTime: 60 * 1000 });

  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="flex flex-col gap-0.5">
        {MAIN.map((entry) => (
          <NavLink
            key={entry.href}
            entry={entry}
            badge={entry.href === "/admin/orders" ? stats?.orders_pending : undefined}
            onNavigate={onNavigate}
            layoutGroup={`admin-nav-${layoutGroup}`}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex h-11 items-center gap-2.5 rounded-md px-3 text-muted transition-colors duration-[--dur-feedback] hover:text-ink"
        >
          <Store className="size-[17px] shrink-0" strokeWidth={1.5} />
          <span className="text-[13.5px]">دیدن فروشگاه</span>
        </Link>

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="flex h-11 items-center gap-2.5 rounded-md px-3 text-start text-muted transition-colors duration-[--dur-feedback] hover:text-ink disabled:opacity-60"
        >
          <LogOut className="size-[17px] shrink-0" strokeWidth={1.5} />
          <span className="text-[13.5px]">{signingOut ? "در حال خروج…" : "خروج"}</span>
        </button>
      </div>
    </div>
  );
}

/** The page title shown in the top bar, derived from the same table. */
export function useAdminTitle(): string {
  const pathname = usePathname();
  const entry = [...MAIN].reverse().find((item) => isCurrent(pathname, item));
  return entry?.title ?? "پنل مدیریت";
}
