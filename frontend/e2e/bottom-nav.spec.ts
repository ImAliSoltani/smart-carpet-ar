import { expect, test } from "@playwright/test";

/**
 * The phone's primary navigation.
 *
 * It exists because the three things this product is *for* — searching by
 * photograph, fitting a rug to a room, measuring one — were all behind a
 * hamburger on the device most people hold. So the assertions worth making are
 * about reachability and about not being in the way, not about how it looks.
 */

const NAV = { name: "ناوبری اصلی" };

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "the bar is drawn below `lg` only");

  test("carries five destinations and lights the one you are on", async ({ page }) => {
    await page.goto("/carpets?intro=0");

    const nav = page.getByRole("navigation", NAV);
    await expect(nav).toBeVisible();

    // Five, not six: §9 `bottom-nav-limit`, and the sixth pushed the pill past
    // a 375px screen.
    const items = nav.getByRole("link");
    await expect(items).toHaveCount(5);

    // The bar describes the page rather than remembering its own last tap —
    // which is the difference between a map and a control, and is what makes it
    // still correct after a back button.
    await expect(nav.getByRole("link", { name: "فرش‌ها" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await nav.getByRole("link", { name: "مشاور چیدمان" }).click();
    await expect(page).toHaveURL(/\/room-adviser/);
    await expect(nav.getByRole("link", { name: "مشاور چیدمان" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // A product page is still «فرش‌ها». Browsing a rug must not unlight the tab
    // that took you to it.
    await page.goto("/carpets?intro=0");
    await page.getByRole("link", { name: /.+/ }).filter({ has: page.locator("img") }).first().click();
    await expect(page).toHaveURL(/\/carpets\/.+/);
    await expect(nav.getByRole("link", { name: "فرش‌ها" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("every icon is named, whether or not its label is drawn", async ({ page }) => {
    // Only the active item shows its word; the rest are icons. An icon a screen
    // reader cannot name is not a destination, so the name lives on the link.
    await page.goto("/carpets?intro=0");
    const links = page.getByRole("navigation", NAV).getByRole("link");
    for (const name of ["فرش‌ها", "جست‌وجوی بصری", "مشاور چیدمان", "راهنمای اندازه"]) {
      await expect(links.filter({ hasText: "" }).and(page.getByLabel(name, { exact: true }))).toHaveCount(1);
    }
  });

  test("shows the longest label whole, and never a word cut in half", async ({ page }) => {
    // Reported: «جست‌وجوی بصری کامل جا نمی‌شه، زشت شده». The label box was a
    // constant sized by eye at 84px; the word is 90.3px at 12.5px Vazirmatn, so
    // the one item whose name is the reason this bar exists was the one clipped.
    //
    // Asserted as «the text is not wider than the box that draws it», which is
    // the actual complaint and stays true whatever the width becomes. A test on
    // the number would have to be rewritten by anyone who changes the wording,
    // and would pass for a label that had been clipped to a new constant.
    await page.goto("/visual-search?intro=0");

    const label = page
      .getByRole("navigation", NAV)
      .getByRole("link", { name: "جست‌وجوی بصری" })
      .locator("span")
      .last();

    await expect(label).toBeVisible();
    const clipped = await label.evaluate(
      (el) => el.scrollWidth > Math.ceil(el.getBoundingClientRect().width) + 1,
    );
    expect(clipped).toBe(false);

    // And the pill it grew to fit must still be on the screen. §3-5 forbids the
    // document scrolling sideways, and being clamped by `max-w` is the same
    // clipped word by another route.
    const overflows = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="ناوبری اصلی"]')!;
      const r = nav.getBoundingClientRect();
      return r.left < -0.5 || r.right > window.innerWidth + 0.5;
    });
    expect(overflows).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  });

  test("gets out of the way when the compare tray takes the bottom", async ({ page }) => {
    // Both live at the bottom of the screen and the tray is `sticky` at a
    // higher layer, so leaving the bar in place does not hide it — it
    // half-covers it, which reads as a bug rather than a decision. The tray is
    // a task the shopper started; the bar is ambient.
    await page.goto("/carpets?intro=0");
    const nav = page.getByRole("navigation", NAV);
    await expect(nav).toBeVisible();

    const toggles = page.getByRole("button", { name: "افزودن به مقایسه" });
    await toggles.first().click();

    await expect(page.getByRole("region", { name: "فهرست مقایسه" })).toBeVisible();
    await expect(nav).toHaveCount(0);
  });
});

test("is not drawn on a desktop, which already has the header", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "this is the large-screen half of the same rule");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/carpets?intro=0");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", NAV)).toBeHidden();
});
