import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Pagination — [shadcn/pagination](https://21st.dev/@shadcn/components/pagination).
 *
 * The decomposition is its own: a `nav`, a `ul` of items, a link that knows
 * whether it is the current page, dedicated previous/next parts and an
 * ellipsis. Four things changed on the way in.
 *
 * **It no longer borrows `buttonVariants`.** The registry dresses an inactive
 * page as `ghost` and the current one as `outline`, and both hover to
 * `bg-accent`. In shadcn's vocabulary that is a neutral surface; in our token
 * map `--color-accent` is the gold, which this palette keeps for small marks.
 * A row of page numbers turning gold on hover is precisely the «gold as
 * dominant colour» that decision exists to prevent, so these take the paper
 * surface like every other selectable thing here.
 *
 * **The chevrons are mirrored.** `Previous` shipped pointing left because in
 * an LTR page that is backwards. This page reads right to left, so back points
 * right and forward points left; the physical `pl`/`pr` go with them.
 *
 * **`<a>` became `next/link`.** The registry stays framework-agnostic; every
 * page here is an internal route, and a plain anchor would reload the whole
 * app to reach one. A part with no `href` renders a `span` instead — that is
 * how the ends of the row are disabled without removing them and letting every
 * number shift sideways.
 *
 * **Targets are 44px, not 36** (ROADMAP §3-5). A page number is exactly the
 * kind of small target that gets missed on a phone.
 */

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="صفحه‌بندی"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

const LINK_BASE =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm " +
  "transition-colors duration-[--dur-feedback]";

export interface PaginationLinkProps {
  /** Absent means this end of the row has nowhere to go. */
  href?: string;
  isActive?: boolean;
  className?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}

function PaginationLink({
  href,
  isActive,
  className,
  children,
  ...props
}: PaginationLinkProps) {
  const classes = cn(
    LINK_BASE,
    isActive
      ? "border border-line-2 bg-paper text-ink"
      : "text-ink-2 hover:bg-paper hover:text-ink",
    href === undefined && "pointer-events-none text-muted opacity-40",
    className,
  );

  if (href === undefined) {
    return (
      <span data-slot="pagination-link" aria-disabled className={classes} {...props}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={classes}
      {...props}
    >
      {children}
    </Link>
  );
}

function PaginationPrevious({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="صفحه‌ی قبل" className={className} {...props}>
      {/* Right, not left: back is the way the page came from. */}
      <ChevronRight className="size-4" />
      <span className="hidden sm:block">قبلی</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, ...props }: PaginationLinkProps) {
  return (
    <PaginationLink aria-label="صفحه‌ی بعد" className={className} {...props}>
      <span className="hidden sm:block">بعدی</span>
      <ChevronLeft className="size-4" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-11 items-center justify-center text-muted", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">صفحه‌های بیشتر</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
