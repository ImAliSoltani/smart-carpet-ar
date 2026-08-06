"use client";

import { cn } from "@/lib/utils";

/**
 * A round control laid over a photograph.
 *
 * Two of these now stack in the corner of every card — the heart and the
 * comparison toggle — and stacking them is what forced the shape.
 *
 * **The pill is 36px and the button is 44.** §3-5 of the roadmap sets the floor
 * for anything you touch, and it is a floor on the area a thumb has to find, not
 * on the area that has to be painted. The chosen direction wants the interface
 * to sit lightly on the carpet, and a 44px disc of paper over the weave is not
 * light; a 36px one inside a 44px hit area is the same picture with the rule
 * kept. The heart was 36 on both counts before this file existed — survivable
 * alone, not survivable with a second undersized target directly beneath it.
 *
 * The press is stopped here rather than at the call site because the whole frame
 * is a link to the product page: without it, hearting a carpet navigates to it.
 */
export function CornerToggle({
  label,
  pressed = false,
  disabled = false,
  onPress,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      // The label reaches a pointer as well as a screen reader. A disabled
      // toggle that cannot say why is the shape of dead button this avoids.
      title={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPress();
      }}
      className="grid size-11 place-items-center rounded-full disabled:cursor-not-allowed"
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full shadow-sm backdrop-blur-sm",
          "transition-colors duration-[--dur-feedback]",
          disabled ? "bg-paper/60 text-muted" : "bg-paper/85 text-ink-2",
        )}
      >
        {children}
      </span>
    </button>
  );
}
