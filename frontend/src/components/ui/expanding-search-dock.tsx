"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A magnifier that opens into a field.
 *
 * `moumensoliman/expanding-search-dock-shadcnui` from 21st.dev, edited into
 * this shop rather than rewritten. What it supplied and what is kept: the two
 * states with one swapping into the other, the spring that carries the width,
 * the field's own magnifier at the reading edge and the dismiss button at the
 * far one.
 *
 * What had to change, and each for a reason this header already learned once:
 *
 * - **The open field does not take part in the layout.** The catalogue version
 *   animates a 48px button into a 320px form *in flow*. This bar is already
 *   nearly full at 375px — the note above the wordmark counts it: the drawer
 *   button and the three tools spend 184px and the padding another 40 — so an
 *   inline 320px field would push the site into sideways scroll, which is the
 *   exact failure that stacking the wordmark was done to fix. So the button
 *   holds its 44px place in the row and the field is laid over the bar.
 *   Animating the width of an out-of-flow element also costs no reflow of
 *   anything around it, which is the other half of why this is the right shape.
 * - **44px, not 48.** Everything a finger touches in this shop is at least 44
 *   and the three tools beside it are exactly that; a fourth at 48 would sit
 *   half a pixel off the row's centre.
 * - **Logical properties.** The original's `ml-4`/`mr-2`/`pr-4` put the
 *   magnifier on the left of the field and the dismiss on the right, which in
 *   Persian is the wrong end of both.
 * - **`prefers-reduced-motion`.** framer writes transforms through JavaScript,
 *   so the stylesheet's reduced-motion block cannot reach it; the roadmap
 *   allows no exceptions, so the hook is what enforces it here.
 *
 * It renders no results of its own. What goes under the field is the caller's
 * (`CarpetSearch`), because a component that knows how to expand should not
 * also know what a carpet is.
 */

export interface ExpandingSearchDockProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: () => void;
  /** Rendered under the open field — the suggestions panel. */
  children?: React.ReactNode;
  placeholder?: string;
  label?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wired to the input so a combobox can be built around it. */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

/**
 * Below this the bar has no room beside the magnifier, and the field takes the
 * whole of it instead of growing out of the icon.
 *
 * Measured rather than picked: at 440px the tools group leaves 324px between
 * the magnifier and the edge of the screen, and a 352px field ran 28px past
 * it — off-screen, and silently, because an overflow to the inline-start in an
 * RTL document does not lengthen `scrollWidth` the way it would in a
 * left-to-right one. `sm` is where the header's own padding changes too.
 */
const NARROW = "(max-width: 639px)";

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * `useSyncExternalStore` rather than a listener in an effect: a media query is
 * exactly the external store this API is for, and the effect version has to
 * call `setState` in its own body to catch the first reading — a cascading
 * render, and the lint rule that forbids it is right.
 */
function useNarrow() {
  return React.useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(NARROW).matches,
    // The server has no viewport. Guessing wide is the safe half: it is a
    // width the field is never clipped at, and the reading arrives before
    // anything can open.
    () => false,
  );
}

export function ExpandingSearchDock({
  value,
  onValueChange,
  onSubmit,
  children,
  placeholder = "جست‌وجو…",
  label = "جست‌وجو در فرش‌ها",
  open,
  onOpenChange,
  inputProps,
}: ExpandingSearchDockProps) {
  const reduced = useReducedMotion();
  const narrow = useNarrow();
  const root = React.useRef<HTMLDivElement>(null);

  // A press anywhere else closes it. `pointerdown` rather than `click`: a press
  // that begins outside and ends inside — a drag that selects text across the
  // panel's edge — should not count as leaving.
  React.useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, onOpenChange]);

  return (
    // `static` under `sm`, and that is what lets the wide field below be
    // measured against the *header* rather than against the 44px button: the
    // bar is `sticky`, which is a positioned element, so an absolute child
    // resolves to it the moment this wrapper stops being the nearer one.
    <div ref={root} className="static sm:relative">
      {/* Always in the row, so opening the field moves nothing. Hidden rather
          than unmounted while open — an element that leaves the layout would
          hand its 44px back to the header and shuffle the tools beside it. */}
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => onOpenChange(true)}
        className={cn(
          "grid size-11 place-items-center rounded-full text-ink-2",
          "transition-colors duration-[--dur-feedback] hover:bg-line hover:text-ink",
          open && "invisible",
        )}
      >
        <Search className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            role="search"
            // Two geometries, because one does not fit both.
            //
            // Wide: anchored to this button's own trailing edge and grown
            // toward the reading direction, so the field opens *out of* the
            // magnifier rather than appearing somewhere else.
            //
            // Narrow: the field is the bar. `inset-x-5` matches the header's
            // own padding, and the centring is CSS rather than an animated `y`
            // — framer would write `transform` and take the translate with it.
            className={cn(
              "z-10",
              narrow
                ? "absolute inset-x-5 top-1/2 -translate-y-1/2"
                : "absolute -top-1 end-0",
            )}
            // Nothing animates width in the narrow case: the width is settled
            // by both insets there, and an inline `width` from framer would
            // win over one of them and put the field back off the screen.
            initial={
              reduced || narrow ? { opacity: 0 } : { width: "2.75rem", opacity: 0 }
            }
            animate={narrow ? { opacity: 1 } : { width: "22rem", opacity: 1 }}
            exit={reduced || narrow ? { opacity: 0 } : { width: "2.75rem", opacity: 0 }}
            transition={
              reduced || narrow
                ? { duration: reduced ? 0 : 0.18 }
                : { type: "spring", stiffness: 320, damping: 32, opacity: { duration: 0.18 } }
            }
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit?.();
            }}
          >
            {/* The focus mark belongs to the whole field, not to the box
                inside it.

                Reported as «two orange bars appear when you search», and that
                is exactly what it was. `globals.css` gives everything a 2px
                gold `:focus-visible` outline at a 3px offset; that rule is
                unlayered, so it outranks Tailwind's `outline-none` and landed
                on the `<input>` — which sits inside this pill, and this pill
                clips. The ring's top and bottom were cut away by
                `overflow-hidden` and its two sides survived as a pair of
                vertical amber bars floating in the middle of the field.

                So the ring comes off the input and the pill darkens its own
                border instead — the same thing the shop's `Input` primitive
                does, and the reason it does it. `has-[input:focus-visible]`
                rather than `focus-within`: a pointer click focuses the input
                too, and a field that outlines itself on every click is noise.

                `overflow-hidden` stays. It is what keeps the input and the
                dismiss button from spilling out of the pill while the width
                animates on a wide screen. */}
            <div
              className={cn(
                "flex items-center gap-2 overflow-hidden rounded-full border border-line-2 bg-paper/95 shadow-panel backdrop-blur-md",
                "transition-colors duration-[--dur-feedback] has-[input:focus-visible]:border-ink",
              )}
            >
              <Search className="ms-4 size-4 shrink-0 text-muted" aria-hidden />
              <input
                {...inputProps}
                type="search"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={placeholder}
                aria-label={label}
                autoFocus
                // Not `outline-none`, which cannot win here: the global focus
                // rule is unlayered and Tailwind's utilities are in a layer,
                // so the utility loses whatever its specificity. The attribute
                // is read by a companion rule in `globals.css`, beside the one
                // it is answering. The pill draws the focus mark instead.
                data-focus-ring="shell"
                // `search` inputs get a browser-drawn clear button in WebKit
                // that sits beside ours and does not follow the theme.
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
              />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="بستن جست‌وجو"
                // Its ring keeps its colour and loses its offset — see the
                // companion rule in `globals.css`. Same reason as the input
                // beside it: the pill clips, and a utility cannot outrank an
                // unlayered rule.
                data-focus-ring="inset"
                className="me-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-2 transition-colors duration-[--dur-feedback] hover:bg-bg hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>

            {children}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
