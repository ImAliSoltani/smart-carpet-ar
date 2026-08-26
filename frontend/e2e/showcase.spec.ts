import { expect, test } from "@playwright/test";

/**
 * The showcase on the front page, and the three ways it was reported broken.
 *
 * Every assertion here is about *time* or about *the edge of the screen*, which
 * is the reason they live in a browser rather than beside the component. A
 * carousel that swaps its slide too early, a timer that never fires again, and
 * a flex row that refuses to shrink are all invisible to anything that renders
 * markup and reads it back: the first two need frames, and the third needs a
 * layout at a real width.
 *
 * Reported (۱۴۰۵/۰۶/۰۴): «اول یه لحظه فرش بعدی رو نشون میده بعد با موشن میره»،
 * «بعضی وقتا لاک میشه، نوار پایین پر میشه و فریز میشه»، «نوار پایین ویترین تو
 * گوشی، آیتم آخر نصف متن از گوشی میزنه بیرون».
 */

const SHOWCASE = 'section[aria-roledescription="carousel"]';
const SLIDE = '[aria-roledescription="اسلاید"]';

/** The slide the carousel is on, as its own counter says it. */
function counter(page: import("@playwright/test").Page) {
  return page.locator(`${SHOWCASE} ${SLIDE}`);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/?intro=0");
  // The showcase is fetched, not rendered on the server: the listing picks the
  // four, and four more requests fetch what they say. Nothing below asserts
  // anything until all of that has landed.
  await expect(page.locator(SHOWCASE)).toBeVisible();
});

test("the turn fades out the slide that is leaving, not the one arriving", async ({ page }) => {
  // The fade and the swap used to be one update, so the arriving carpet was
  // painted at full opacity for the first frames of a transition meant to
  // hide it. Asserted as «the slide had not changed while the old one was
  // still visible», which is the complaint itself: the number here is half a
  // transition (310ms), and the old behaviour changed it inside one frame.
  const swap = await page.evaluate(async () => {
    const root = document.querySelector('section[aria-roledescription="carousel"]')!;
    const slide = root.querySelector('[aria-roledescription="اسلاید"]')!;
    const prose = root.querySelector("[aria-live]")!;
    const before = slide.getAttribute("aria-label");
    const started = performance.now();
    root.querySelector<HTMLButtonElement>('button[aria-label="اسلاید بعدی"]')!.click();

    return await new Promise<{ ms: number; opacity: number }>((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - started;
        if (slide.getAttribute("aria-label") !== before) {
          resolve({ ms: elapsed, opacity: Number(getComputedStyle(prose).opacity) });
        } else if (elapsed > 3000) {
          // It never turned at all — reported as a swap at time -1 rather than
          // left to time the whole test out with nothing to read.
          resolve({ ms: -1, opacity: -1 });
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  });

  expect(swap.ms).toBeGreaterThan(200);
  // And when it did arrive, the slide it replaced had already gone.
  expect(swap.opacity).toBeLessThan(0.15);
});

test.describe("autoplay", () => {
  // Two ways of touching a carousel that used to stop it for good. Both wait
  // for a turn that has to happen without anyone asking for one, so both are
  // written as «it turned again», not as «the flag is false».
  const TURNS_ON_ITS_OWN = { timeout: 20_000 };

  test("survives being driven by hand", async ({ page }) => {
    // Pressing «بعدی» with a mouse also focuses the button it pressed, and the
    // pause held for anything focused inside the section. Nothing takes that
    // focus away afterwards, so one press was the last turn the carousel ever
    // made.
    const label = counter(page);
    await page.locator(`${SHOWCASE} button[aria-label="اسلاید بعدی"]`).click();
    const afterPress = await label.getAttribute("aria-label");

    await expect
      .poll(() => label.getAttribute("aria-label"), TURNS_ON_ITS_OWN)
      .not.toBe(afterPress);
  });

  test("survives being looked at", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "a phone has no pointer to rest on anything");

    // Reported as «وقتی user داره ویترین رو می‌بینه pause میشه، وقتی scroll
    // می‌کنه پایین‌تر نرمال شروع می‌کنه حرکت کردن». Both halves are the same
    // fact: the carousel paused while the pointer was over it, and the scroll
    // did not start it — it moved the section out from under the pointer.
    const label = counter(page);
    const before = await label.getAttribute("aria-label");
    await page.locator(`${SHOWCASE} ${SLIDE}`).hover();

    await expect.poll(() => label.getAttribute("aria-label"), TURNS_ON_ITS_OWN).not.toBe(before);
  });

  test("survives being touched", async ({ page, isMobile }) => {
    test.skip(!isMobile, "there is no tap on a desktop");

    // Chrome on Android answers a tap with the compatibility mouse events —
    // `mouseover` and `mouseenter` among them — and sends no matching leave
    // until something else is touched. A hover pause wired to mouse events
    // therefore stopped on the first touch of the picture and stayed stopped.
    const label = counter(page);
    const before = await label.getAttribute("aria-label");
    // The frame, not the photograph inside it. The photograph is under a
    // fourteen-second Ken Burns push, so it never satisfies Playwright's
    // «element is stable» check and the tap is retried until the test times
    // out — a failure that says nothing about autoplay. The frame around it
    // does not move, and the tap still lands on the picture.
    await page.locator(`${SHOWCASE} ${SLIDE}`).tap();

    await expect.poll(() => label.getAttribute("aria-label"), TURNS_ON_ITS_OWN).not.toBe(before);
  });
});

test("spends its seven seconds on someone who is looking", async ({ page }) => {
  // Reported from a real phone: «چرا فقط بعد از لمس شروع می‌کند؟». It could not
  // be reproduced in an emulated one — but the timer did start at mount, which
  // on this page is behind the entrance film and two screens below the fold. A
  // visitor who scrolls down then arrives somewhere in the middle of an
  // interval, which looks exactly like a carousel that does not move.
  //
  // Asserted from both ends, because only the pair says anything: it must not
  // turn while it cannot be seen, and it must turn once it can — without being
  // touched, which is the whole point.
  const label = counter(page);
  const first = await label.getAttribute("aria-label");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(9_000);
  expect(await label.getAttribute("aria-label")).toBe(first);

  await page.locator(SHOWCASE).scrollIntoViewIfNeeded();
  await expect
    .poll(() => label.getAttribute("aria-label"), { timeout: 20_000 })
    .not.toBe(first);
});

test("keeps the labels under its bar on the screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the row is only ever tight on a phone");

  // 320px: the narrowest phone anyone still browses on, and the width where
  // this row has to be measured. The device this project runs is 412 wide and
  // the fixture is three carpets, not the shop's four — at that size the labels
  // happen to fit, so a test that only ever ran there would have passed over
  // the bug it was written for.
  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.locator(SHOWCASE)).toBeVisible();

  // Reported as «آیتم آخر نصف متن از گوشی میزنه بیرون». A flex item's automatic
  // minimum is its own content, and those labels do not wrap — so `flex-1`
  // could not shrink the buttons, `truncate` was never reached, and the row
  // simply ran past the near edge of the screen, where the section's
  // `overflow-hidden` cut it off mid-word.
  const row = page.locator(`${SHOWCASE} button[aria-label^="رفتن به "]`).first();
  await expect(row).toBeVisible();

  const measured = await page.evaluate(() => {
    const button = document.querySelector<HTMLElement>('button[aria-label^="رفتن به "]')!;
    const strip = button.parentElement!;
    return {
      scrollWidth: strip.scrollWidth,
      clientWidth: strip.clientWidth,
      offscreen: [...strip.children].some((child) => {
        const box = child.getBoundingClientRect();
        return box.left < -0.5 || box.right > window.innerWidth + 0.5;
      }),
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
    };
  });

  expect(measured.scrollWidth).toBeLessThanOrEqual(measured.clientWidth);
  expect(measured.offscreen).toBe(false);
  // §3-5: and the page itself still does not scroll sideways.
  expect(measured.documentScrollWidth).toBe(measured.documentClientWidth);
});
