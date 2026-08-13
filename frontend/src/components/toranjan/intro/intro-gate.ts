/**
 * Whether the entrance runs at all.
 *
 * Four things can stop it, and they are checked in this order because the
 * cheapest and most absolute come first:
 *
 * 1. `prefers-reduced-motion` — §3-5 has no exceptions, and the brief is
 *    explicit that the film collapses to a single still.
 * 2. `?intro=1` forces it on regardless of the rest. That exists for the day of
 *    the defence, when it has to run on demand.
 * 3. Seen in the last 24 hours. An entrance is a first impression; the second
 *    time it is an obstacle between somebody and a shop they already chose.
 * 4. Storage refused (private mode, blocked cookies) — then it simply plays.
 *
 * **The decision has to be made before the first paint**, which is why the
 * script version of this runs blocking in the document head. Deciding after
 * hydration shows a frame of the shop and then covers it, which is worse than
 * not gating at all.
 */

export const INTRO_SEEN_KEY = "toranjan.introSeenAt";
export const INTRO_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The same rule as the inline script, for the client component to agree with.
 *
 * It is written twice on purpose: once as a string that must run before React
 * exists, and once as a function React can call. Deriving one from the other
 * would mean shipping a parser or an eval, and this rule is four lines.
 */
export function shouldPlayIntro(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("intro") === "1") return true;

  try {
    const seenAt = Number.parseInt(
      window.localStorage.getItem(INTRO_SEEN_KEY) ?? "0",
      10,
    );
    if (seenAt > 0 && Date.now() - seenAt < INTRO_WINDOW_MS) return false;
  } catch {
    /* storage refused — play it */
  }
  return true;
}

/** Watched through, skipped, or abandoned — either way it has been seen. */
export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, String(Date.now()));
  } catch {
    /* nothing to do; it will simply play again */
  }
}

export function forgetIntro(): void {
  try {
    window.localStorage.removeItem(INTRO_SEEN_KEY);
  } catch {
    /* nothing to do */
  }
}

/**
 * The head script, as a string.
 *
 * Runs before the body is parsed so `data-intro` is on `<html>` in time for the
 * first paint, and the stylesheet can hold the shop back without React having
 * loaded. It must stay dependency-free and must never throw: a syntax error
 * here is a blank site.
 */
export const INTRO_HEAD_SCRIPT = `
(function(){
  try {
    var d = document.documentElement;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var forced = /[?&]intro=1(?:&|$)/.test(location.search);
    var home = location.pathname === '/';
    if (!home || reduce) { d.setAttribute('data-intro','skip'); return; }
    if (forced) { d.setAttribute('data-intro','play'); return; }
    var seen = parseInt(localStorage.getItem('${INTRO_SEEN_KEY}') || '0', 10);
    var fresh = seen > 0 && (Date.now() - seen) < ${INTRO_WINDOW_MS};
    d.setAttribute('data-intro', fresh ? 'skip' : 'play');
  } catch (e) {
    document.documentElement.setAttribute('data-intro','play');
  }
})();
`.trim();
