"use client";

import * as React from "react";

import { FilterPanel, FilterTrigger, SortControl } from "@/components/toranjan/filter-panel";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/**
 * Where the filter panel lives at each width.
 *
 * One panel, two places. On a wide screen it is a column beside the grid and
 * always open, because a filter you cannot see is a filter nobody uses. Below
 * that there is no room for a column, so the same component moves into the
 * drawer the header already uses — the trigger carries how many filters are
 * on, which is the only thing a closed panel can still say.
 */
export function FiltersShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-[94px]">
          <FilterPanel />
        </div>
      </aside>

      <div>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <FilterTrigger onClick={() => setOpen(true)} />
          <div className="ms-auto">
            <SortControl />
          </div>
        </div>
        {children}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="فیلترها" side="start" className="w-[90%] max-w-md overflow-y-auto">
          <p className="mb-5 mt-1 text-lg">فیلترها</p>
          <FilterPanel />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-6 h-12 w-full rounded-full bg-cta text-sm text-on-cta transition-colors duration-[--dur-feedback] hover:bg-cta-hover"
          >
            دیدن نتیجه‌ها
          </button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
