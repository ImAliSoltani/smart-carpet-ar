import type { OrderStatus } from "@/lib/api/types";
import { ORDER_STATUS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * One of the three states an order is in (ROADMAP §6-17).
 *
 * **Traffic-light colours, which is a reversal, and a deliberate one.** The
 * first version used the shop's own palette — gold for confirmed, a hairline
 * for waiting — because §4 rejects green for the storefront's confirmation
 * gesture: it would be the only green on the site and would read as a system
 * message rather than as this shop confirming something.
 *
 * That reasoning is about a shopper being congratulated once. It does not
 * carry into a back office, where the same three words are scanned across a
 * hundred rows and the reader already knows what green, amber and red mean
 * before reading a single label. Making them relearn a gold-means-done rule
 * costs them time on every screen. The storefront's `/track` page keeps its
 * own tones and is untouched by this.
 *
 * The colours are tokens, not literals, so they hold on either ground. Each
 * was measured against the worst place a badge lands — glass over the
 * scrimmed skylight — and clears AA there: 8.49, 8.86 and 5.35 to one.
 *
 * **The dot is not decoration.** Three states told apart only by colour fail
 * anyone who cannot separate those colours, so each keeps its own shape of
 * mark — filled, hollow, and a struck line — and the word is always present.
 */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const { label, tone } = ORDER_STATUS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12.5px] font-medium",
        tone === "confirmed" && "border-status-confirmed/35 bg-status-confirmed/12 text-status-confirmed",
        tone === "waiting" && "border-status-waiting/35 bg-status-waiting/12 text-status-waiting",
        tone === "cancelled" && "border-status-cancelled/35 bg-status-cancelled/12 text-status-cancelled",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "confirmed" && "bg-status-confirmed",
          tone === "waiting" && "border border-status-waiting bg-transparent",
          tone === "cancelled" && "h-px w-2 rounded-none bg-status-cancelled",
        )}
      />
      {label}
    </span>
  );
}
