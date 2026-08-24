import { expect, test } from "@playwright/test";

/**
 * The corner editor has to answer a finger that is moving slowly.
 *
 * Reported from the panel: nudging a handle a little at a time to line it up
 * with a carpet's corner does nothing for a while and then jumps. That is a
 * measurement, not a matter of taste — a drag of N pixels should move the
 * handle N pixels, whether it arrives in one step or forty.
 */

const CREDENTIALS = { username: "admin", password: "e2e-password" };

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/نام کاربری/).fill(CREDENTIALS.username);
  await page.getByLabel(/رمز/).fill(CREDENTIALS.password);
  await page.getByRole("button", { name: /ورود/ }).click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
}

test("a slow drag moves the handle by as much as the pointer moved", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/ar");

  const firstReview = page.locator('a[href^="/admin/ar/"]').first();
  await expect(firstReview).toBeVisible();
  await firstReview.click();

  const handle = page.getByRole("button", { name: /گوشه‌ی/ }).first();
  await expect(handle).toBeVisible();

  // The handles are positioned as a percentage of the photograph's box, so a
  // measurement taken while that box is still growing compares two different
  // layouts and reports a drag that never happened. Wait for the image to be
  // decoded and for its width to stop changing before touching anything.
  await page.waitForFunction(() => {
    const img = document.querySelector("img[alt]") as HTMLImageElement | null;
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await expect
    .poll(async () => (await handle.boundingBox())?.x ?? -1)
    .toBe((await handle.boundingBox())?.x ?? -2);

  const before = await handle.boundingBox();
  if (!before) throw new Error("the handle has no box");
  const startX = before.x + before.width / 2;
  const startY = before.y + before.height / 2;

  // Forty one-pixel steps: the slow, careful drag being complained about,
  // rather than one long sweep a browser would never have to think about.
  const STEPS = 40;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= STEPS; i += 1) {
    await page.mouse.move(startX + i, startY + i);
  }
  await page.mouse.up();

  const after = await handle.boundingBox();
  if (!after) throw new Error("the handle has no box after the drag");


  const movedX = after.x - before.x;
  const movedY = after.y - before.y;

  // Two pixels of slack per axis. The handle is placed as a percentage of a
  // frame whose width is not a whole number of pixels, and the mobile project
  // runs at a device ratio of 2.625 — so a 40px drag lands 1 to 1.5px off, and
  // asking for ±1 made this test flaky rather than strict. It does not
  // accumulate: the position is recomputed from the pointer on every move
  // rather than added to, so this is rounding of one final value.
  //
  // The tolerance is still nowhere near the bug it guards. That one moved the
  // handle 173px for 40px of pointer.
  //
  // Caught by running the whole suite; ±1 had passed five times in a row on
  // chromium, which is the wrong browser to repeat a sub-pixel test on.
  expect(Math.abs(movedX - STEPS)).toBeLessThanOrEqual(2);
  expect(Math.abs(movedY - STEPS)).toBeLessThanOrEqual(2);
});

test("grabbing a handle off-centre does not move the corner", async ({ page }) => {
  // The reported jump, and the reason a mouse cannot show it. The touch target
  // is 44px wide while the mark inside it is 18, so a fingertip lands anywhere
  // within about twenty pixels of the point it is aiming at — and the press
  // used to move the corner to wherever it landed. A mouse is clicked dead
  // centre, so the jump is zero and every test passed.
  //
  // Twenty screen pixels is not twenty pixels of carpet either: the photograph
  // is displayed a little over 300px wide and is over 800 wide, so one screen
  // pixel is two and a half of the pixels the corner is measured in.
  await signIn(page);
  await page.goto("/admin/ar");
  await page.locator('a[href^="/admin/ar/"]').first().click();

  const handle = page.getByRole("button", { name: /گوشه‌ی/ }).first();
  await expect(handle).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector("img[alt]") as HTMLImageElement | null;
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await expect
    .poll(async () => (await handle.boundingBox())?.x ?? -1)
    .toBe((await handle.boundingBox())?.x ?? -2);

  const box = await handle.boundingBox();
  if (!box) throw new Error("the handle has no box");

  // Read the corner itself, not the handle's position in the viewport. Pressing
  // a handle focuses it, focusing can scroll the page, and a scrolled page
  // moves every box on it — which reported a corner that had not moved as
  // having moved two pixels, and would have had me fixing the wrong thing.
  const cornerStyle = () => handle.evaluate((el) => `${el.style.left}|${el.style.top}`);
  const before = await cornerStyle();

  // Press well inside the target but away from its centre — where a finger
  // actually lands — and let go without moving at all.
  // Fourteen pixels off centre on each axis — about twenty from the point,
  // which is where a fingertip lands on a 44px target. Not further: the handle
  // is a circle of radius 22 and hit-testing respects that, so a press at the
  // corner of its bounding box falls through to the photograph behind it. The
  // first version of this test pressed there, reached nothing, and passed.
  await handle.scrollIntoViewIfNeeded();
  const anchored = await handle.boundingBox();
  if (!anchored) throw new Error("the handle has no box");
  await page.mouse.move(anchored.x + 36, anchored.y + 36);
  await page.mouse.down();
  await page.mouse.up();

  expect(await cornerStyle()).toBe(before);
});
