import type { OrderStatus } from "@/lib/api/types";
import { ORDER_STATUS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

/**
 * One of the three states an order is in (ROADMAP §6-17).
 *
 * The 21st table this came from paints its statuses green, amber and a solid
 * red — a palette this shop does not have and, in the red's case, a weight it
 * does not want: a cancelled order is a fact to record, not an alarm to sound.
 *
 * So the tones come from our own tokens. Confirmed takes the `confirm` pair
 * that was chosen for exactly this job. Waiting is paper and a hairline, which
 * is what «nothing has happened yet» should look like. Cancelled is the
 * destructive colour as *text* on a plain ground rather than a filled pill.
 *
 * **The dot is not decoration.** Three states told apart only by colour fail
 * anyone who cannot separate those colours, so each carries its own shape of
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
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px]",
        tone === "confirmed" && "border-transparent bg-confirm-tint text-confirm-tint-ink",
        tone === "waiting" && "border-line-2 text-ink-2",
        tone === "cancelled" && "border-line-2 text-destructive",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "confirmed" && "bg-confirm-tint-ink",
          tone === "waiting" && "border border-ink-2 bg-transparent",
          tone === "cancelled" && "h-px w-2 rounded-none bg-destructive",
        )}
      />
      {label}
    </span>
  );
}
