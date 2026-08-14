/**
 * Names for the elements that survive a navigation.
 *
 * A view transition pairs an element on the page being left with an element on
 * the page being entered by matching their names, so the name has to be derived
 * from the thing itself rather than from where it sits: the grid does not know
 * it is the grid, and the product page does not know which card was pressed.
 * The slug is the one identifier both sides already hold.
 *
 * The names have to be unique *within a document* at the moment the snapshot is
 * taken. The browser drops the whole transition when two elements claim one
 * name — silently, apart from a console warning — so a page that can show the
 * same carpet twice must name only one of them. Today only the grid card and
 * the product page's own frame are named, and «فرش‌های مشابه» never returns the
 * carpet whose page it is on.
 */

/**
 * The photograph, from a card in a grid to the frame on the product page.
 *
 * `view-transition-name` is a CSS `<custom-ident>`: the prefix guarantees the
 * name starts with a letter, and every character the identifier grammar would
 * refuse is folded to a hyphen. Anything above U+007F is left alone — the
 * grammar accepts it, and folding it would collapse two Persian slugs into one
 * name, which is the one failure that takes the transition down.
 */
export function carpetPhotoName(slug: string): string {
  const ident = slug.replace(/[^\w-]/g, (ch) => (ch.charCodeAt(0) > 127 ? ch : "-"));
  return `carpet-photo-${ident}`;
}

/**
 * The view transition class both ends carry, so one rule in `globals.css` sets
 * the timing for the pair. Written once here rather than typed twice, because a
 * class that matches on one side only produces a morph with default timing and
 * no error to say so.
 */
export const CARPET_PHOTO_CLASS = "carpet-photo";
