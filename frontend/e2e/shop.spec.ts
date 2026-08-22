import { expect, test } from "@playwright/test";

/**
 * The buying journey, end to end, as ROADMAP §8 فاز ۵ asks for it.
 *
 * One long test rather than five short ones, because the thing being checked is
 * the *sequence*: a cart that survives a navigation, a total that survives the
 * cart, a reference that survives the order. Split into independent tests, each
 * would have to fabricate the state the previous one produced, and fabricated
 * state is exactly where a seam bug hides.
 *
 * Everything is located the way a person finds it — a heading, a link's words, a
 * button's label. Selectors built from class names would pass while the page was
 * unusable, which is the one thing this layer must not do.
 */

const CARPET = { slug: "e2e-kashan-red", name: "کاشان لچک‌ترنج قرمز" };
const SOLD_OUT = { slug: "e2e-tabriz-sold-out", name: "تبریز هندسی سبز" };

test("a shopper browses, filters, buys, and can look the order up again", async ({ page }) => {
  // --- the listing --------------------------------------------------------
  await page.goto("/carpets");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: CARPET.name, exact: true })).toBeVisible();

  // A filter narrows the page and says so in the URL, because §«حالت همان URL
  // است» — a filtered view has to be shareable and has to survive a reload.
  await page.goto("/carpets?color=blue");
  await expect(page).toHaveURL(/color=blue/);
  await expect(page.getByRole("link", { name: "نایین افشان سرمه‌ای", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: CARPET.name, exact: true })).toHaveCount(0);

  // --- the product page ---------------------------------------------------
  await page.goto(`/carpets/${CARPET.slug}`);
  await expect(page.getByRole("heading", { name: CARPET.name })).toBeVisible();
  // The AR entry point is the one button §6-3 calls برجسته; if it stops
  // pointing at the AR route, the headline capability is unreachable.
  //
  // Located by href rather than by label, because the «فرش‌های مشابه» row lower
  // down is made of cards that carry the same words — theirs go to
  // `/carpets/{slug}#ar` on *their own* product page, which is right, and is
  // also why the label alone is ambiguous here.
  const arButton = page.locator(`a[href^="/carpets/${CARPET.slug}/ar"]`);
  await expect(arButton).toBeVisible();
  await expect(arButton).toContainText("در خانه‌ی من ببین");

  await page.getByRole("button", { name: /افزودن به سبد/ }).click();

  // Waited for, because the button holds a short «در حال افزودن…» before it
  // writes to the cart and navigating on the click alone arrives at an empty
  // one.
  //
  // Waited for on the *stored* cart rather than on the button's own «به سبد
  // اضافه شد», which was the first attempt and is worthless: the three labels
  // are stacked in one grid cell and swapped with `opacity`, and Playwright
  // counts an `opacity: 0` element as visible — so that assertion passed
  // instantly, every time, including when nothing had been added.
  //
  // `toranjan.cart` is the persisted key (lib/store/cart.ts). Reaching into
  // storage is a coupling worth paying: it is the only signal meaning «the cart
  // now holds this» that does not depend on which layout is on screen, and the
  // desktop header and the mobile drawer show the count in different places.
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem("toranjan.cart");
    if (!raw) return false;
    const lines = JSON.parse(raw)?.state?.lines;
    return Array.isArray(lines) && lines.length === 1;
  });

  // --- the cart -----------------------------------------------------------
  await page.goto("/cart");
  await expect(page.getByText(CARPET.name)).toBeVisible();
  await page.getByRole("link", { name: /ادامه و ثبت سفارش/ }).click();

  // --- checkout -----------------------------------------------------------
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByLabel("نام و نام خانوادگی").fill("علی سلطانی تهرانی");
  await page.getByLabel("شماره‌ی موبایل").fill("۰۹۱۲۳۴۵۶۷۸۹");
  await page.getByRole("button", { name: "ادامه" }).click();

  await page.getByLabel("نشانی تحویل").fill("تهران، خیابان ولیعصر، کوچه‌ی نهم، پلاک ۱۲، واحد ۳");
  await page.getByRole("button", { name: "ادامه" }).click();

  // The review step must actually be *reached*, and this line is why the test
  // is written in three separate steps rather than filling every field and
  // submitting. It failed here first: pressing «ادامه» placed the order in the
  // same click, so the shopper was handed a tracking code for a purchase they
  // had never confirmed. See the note on the two `key`s in checkout-form.tsx.
  await expect(page.getByRole("heading", { name: /سفارش ثبت شد/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /ثبت سفارش/ })).toBeVisible();
  await page.getByRole("button", { name: /ثبت سفارش/ }).click();

  // --- the reference ------------------------------------------------------
  await expect(page.getByRole("heading", { name: /سفارش ثبت شد/ })).toBeVisible();
  const reference = (await page.getByText(/^[A-Z0-9-]{6,}$/).first().innerText()).trim();
  expect(reference).not.toEqual("");

  // --- tracking -----------------------------------------------------------
  // A guest order has no account behind it, so this pair is the only way back
  // to it. If tracking breaks, the shop has taken an order it cannot show.
  await page.goto(`/track?ref=${encodeURIComponent(reference)}`);
  await expect(page.getByText(reference)).toBeVisible();
});

test("a size with no stock cannot be bought", async ({ page }) => {
  // The path that costs a real shop an apology rather than a sale.
  await page.goto(`/carpets/${SOLD_OUT.slug}`);
  await expect(page.getByRole("heading", { name: SOLD_OUT.name })).toBeVisible();
  await expect(page.getByRole("button", { name: /افزودن به سبد/ })).toBeDisabled();
});

test("the persian text search finds a carpet by its name", async ({ page }) => {
  await page.goto("/carpets?q=نایین");
  await expect(page.getByRole("link", { name: "نایین افشان سرمه‌ای", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: CARPET.name, exact: true })).toHaveCount(0);
});

test("a search that matches nothing says so instead of showing everything", async ({ page }) => {
  // Answering with the whole catalogue reads as an answer and is not one.
  await page.goto("/carpets?q=زرافه");
  await expect(page.getByRole("link", { name: CARPET.name, exact: true })).toHaveCount(0);
  await expect(page.getByText(/پیدا نشد|چیزی یافت نشد|نتیجه‌ای/)).toBeVisible();
});
