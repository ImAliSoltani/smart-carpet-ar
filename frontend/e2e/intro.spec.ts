import { expect, test } from "@playwright/test";

/**
 * The entrance must never be able to hold the shop hostage.
 *
 * While it runs, `data-intro="play"` is on `<html>`: the stylesheet locks
 * `overflow` on the body and the film is a fixed modal over everything. That is
 * correct while the film is playing and catastrophic if it never stops — the
 * page then scrolls nowhere and answers no touch, and the only way out is
 * closing the tab. It was reported from a real phone, after locking the screen
 * and coming back.
 *
 * The cause is not one stalled call but a shape: the boot sequence awaited an
 * image `onload`, a `fetch` and a decode, none of which is obliged to ever
 * settle when a phone suspends the page, and none of which had a deadline. So
 * these tests do not simulate a lock. They do what a lock does — stop the
 * frames from arriving — and then ask the only question that matters: can
 * somebody get into the shop.
 */

/** The state the stylesheet reads. Anything but `play`/`rising` means released. */
const introState = (page: import("@playwright/test").Page) =>
  page.evaluate(() => document.documentElement.getAttribute("data-intro"));

/** Hangs every frame request without failing it — a sleeping radio, not a 404. */
async function stallTheFilm(page: import("@playwright/test").Page) {
  await page.route("**/intro/**", () => {
    /* deliberately never fulfilled, never aborted */
  });
}

test("a second gesture gets into the shop even if no frame ever arrives", async ({ page }) => {
  await stallTheFilm(page);
  await page.goto("/?intro=1");

  // The film is up and holding the page, which is the correct state to start
  // from — the test is about leaving it, not about avoiding it.
  await expect.poll(() => introState(page)).toBe("play");

  // The visitor tries to get in. The first is held on purpose: it usually
  // arrives just before the opening chapter is playable, and replaying it is
  // what makes the entrance feel answerable.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);

  // The second says the first was not answered. A loading state that keeps
  // holding here is a locked door.
  await page.keyboard.press("ArrowDown");

  await expect.poll(() => introState(page), { timeout: 5000 }).not.toMatch(/play|rising/);
  await expect(page.getByRole("link", { name: "همه‌ی فرش‌ها" })).toBeVisible();
});

test("after the deadline the entrance answers a single gesture", async ({ page }) => {
  // The same failure with nobody touching the screen — the phone was locked and
  // put in a pocket, and the frames stopped arriving while it was away.
  //
  // What is asserted here is deliberately *not* that the page lets itself out.
  // An entrance that dismissed itself while the visitor was away would take the
  // one thing it exists for with it; coming back to the film still standing
  // there is right. What must be true is that it is **answerable** — one
  // gesture, one shop. That is the whole difference between a film and a locked
  // door.
  await stallTheFilm(page);
  await page.goto("/?intro=1");
  await expect.poll(() => introState(page)).toBe("play");

  // Past the engine's arm deadline, with nothing pressed in the meantime — so
  // this proves the deadline and not the second-gesture escape above.
  await page.waitForTimeout(14_000);

  await page.keyboard.press("ArrowDown");

  await expect.poll(() => introState(page), { timeout: 5000 }).not.toMatch(/play|rising/);

  // Released means usable, not merely a changed attribute: the body has to
  // scroll again, which is the thing the visitor actually noticed was gone.
  const locked = await page.evaluate(
    () =>
      getComputedStyle(document.documentElement).overflow === "hidden" ||
      getComputedStyle(document.body).overflow === "hidden",
  );
  expect(locked).toBe(false);
  await expect(page.getByRole("link", { name: "همه‌ی فرش‌ها" })).toBeVisible();
});
