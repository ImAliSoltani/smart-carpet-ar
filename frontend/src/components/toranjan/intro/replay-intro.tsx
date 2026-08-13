"use client";

import { Clapperboard } from "lucide-react";

import { forgetIntro } from "./intro-gate";

/**
 * Plays the entrance again.
 *
 * The film is deliberately hard to see twice — half an hour of «already seen»
 * means somebody moving around the shop is never interrupted by it. That rule
 * is right and it leaves a gap: the entrance is the one part of this site that
 * cannot be reached on purpose, and it is the part most worth showing someone.
 * This is the door back to it.
 *
 * It clears the timestamp *and* asks for the film by name. Clearing alone would
 * be enough today, but `?intro=1` is the switch that overrides every reason to
 * skip, so the button keeps working whatever the gate learns to check next.
 *
 * A full navigation rather than a router push: the gate is a blocking script
 * that runs once per document, so the decision it makes is only remade by
 * loading a document.
 */
export function ReplayIntro({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        forgetIntro();
        window.location.href = "/?intro=1";
      }}
      className={className}
    >
      <Clapperboard className="size-4" strokeWidth={1.5} aria-hidden />
      پخش دوباره‌ی مقدمه
    </button>
  );
}
