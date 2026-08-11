"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Makes a whole table row open something, without lying about what it is.
 *
 * The obvious version — wrap the row in an `<a>` — is not available: a table
 * row cannot contain an anchor and stay a table row, and `display: contents`
 * on one has a history of dropping the link from the accessibility tree.
 *
 * So the row listens for a click and navigates, and the real link stays in the
 * first cell where it always was. That link is what keyboard users tab to, what
 * a screen reader announces, and what «open in new tab» acts on; this only adds
 * a larger target for a pointer, which is what «the whole row should be
 * clickable» actually means.
 *
 * Three things it deliberately does not swallow:
 *
 * - **A click on anything already interactive.** Rows carry `tel:` links and
 *   buttons; without this check, pressing «call» would open the order instead.
 * - **A click that ends a text selection.** Copying a tracking code out of a
 *   table is a normal thing to do, and it ends with the pointer inside a row.
 * - **A modified click.** Ctrl/Cmd/middle-click means «new tab», and answering
 *   it with a same-tab navigation is the rudest possible reply.
 */
export function useRowLink(href: string) {
  const router = useRouter();

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      if (event.defaultPrevented) return;
      // Left button only, and never a new-tab gesture.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("a, button, input, select, textarea, label, [role='button']")) return;
      if (window.getSelection()?.toString()) return;

      router.push(href);
    },
    [href, router],
  );

  return {
    onClick,
    // A pointer cursor over the row, so the larger target is discoverable
    // rather than a thing you find by accident.
    className: "cursor-pointer",
  };
}
