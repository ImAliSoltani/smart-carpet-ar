import { expect, test } from "@playwright/test";

/**
 * Stepping sideways between the five tabs with a finger.
 *
 * Driven by dispatching pointer events rather than through `page.touchscreen`,
 * which taps but cannot drag. What is under test is the handler's contract —
 * which gestures move a tab and which must not — and that is exactly what a
 * dispatched down/up pair exercises.
 */

/** A finger that presses at one point and lifts at another. */
async function swipe(
  page: import("@playwright/test").Page,
  from: [number, number],
  to: [number, number],
  pointerType: "touch" | "mouse" = "touch",
) {
  await page.evaluate(
    ([f, t, kind]) => {
      const opts = { pointerType: kind as string, isPrimary: true, pointerId: 1, bubbles: true };
      const [x1, y1] = f as [number, number];
      const [x2, y2] = t as [number, number];
      document.body.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x1, clientY: y1 }));
      document.body.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: x2, clientY: y2 }));
    },
    [from, to, pointerType] as const,
  );
}

test.describe("swiping between tabs", () => {
  test("a finger travelling right moves to the next tab, and left comes back", async ({ page }) => {
    // The page follows the finger. Index 0 is the rightmost tab, so the tab
    // after it sits further left and reaching it moves the strip right. The
    // reasoning is written out in `lib/tabs.ts` because it is the kind of thing
    // that is obvious and backwards.
    await page.goto("/carpets?intro=0");

    await swipe(page, [110, 400], [260, 403]);
    await expect(page).toHaveURL(/\/visual-search/);

    await swipe(page, [260, 400], [110, 403]);
    await expect(page).toHaveURL(/\/carpets/);
  });

  test("the strip has ends, and stops at them", async ({ page }) => {
    // A bounce would be inventing a place to go.
    await page.goto("/carpets?intro=0");
    await swipe(page, [260, 400], [110, 403]);
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/carpets(\?|$)/);
  });

  test("a scroll, a mouse drag and a nudge are none of them swipes", async ({ page }) => {
    // Each of these is something else the visitor is doing, and taking it would
    // make the shop change under them while they did it. The vertical one is
    // the dangerous case: every long page drifts sideways under a thumb.
    await page.goto("/carpets?intro=0");

    await swipe(page, [150, 600], [210, 250]);
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/carpets/);

    await swipe(page, [110, 400], [270, 402], "mouse");
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/carpets/);

    await swipe(page, [150, 400], [190, 402]);
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/carpets/);
  });

  test("a drag inside a sideways-scrolling strip belongs to the strip", async ({ page }) => {
    // The compare table is dragged sideways on purpose; stealing that to change
    // tabs would make it unusable. Built here rather than assumed, because the
    // guard walks up from the event target and a test that never finds a
    // scroller passes without exercising it.
    await page.goto("/carpets?intro=0");
    await page.evaluate(() => {
      const strip = document.createElement("div");
      strip.id = "probe-strip";
      strip.style.cssText =
        "position:fixed;inset-inline:0;top:300px;height:120px;overflow-x:auto;z-index:99";
      const wide = document.createElement("div");
      wide.style.cssText = "width:3000px;height:100px";
      strip.appendChild(wide);
      document.body.appendChild(strip);
    });

    await page.evaluate(() => {
      const strip = document.getElementById("probe-strip")!;
      const opts = { pointerType: "touch", isPrimary: true, pointerId: 2, bubbles: true };
      strip.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: 100, clientY: 350 }));
      strip.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: 280, clientY: 352 }));
    });

    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/carpets/);
  });
});
