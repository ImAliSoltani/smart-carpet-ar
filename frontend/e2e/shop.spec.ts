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

test("the magnifier in the header suggests carpets as they are typed", async ({ page }) => {
  // Reported as «there is nowhere on the site to search a product by name».
  // The endpoint answered `?q=` the whole time and the listing page had a field
  // for it — behind the filter panel, which is not where anybody looks for a
  // search. So what is checked here is the reachable path: press the magnifier
  // that is on every page, type, and be offered the carpet before submitting
  // anything.
  await page.goto("/carpets");
  await page.getByRole("button", { name: /جست‌وجو در فرش‌ها/ }).click();

  const field = page.getByRole("combobox", { name: /جست‌وجو در فرش‌ها/ });
  await expect(field).toBeFocused();
  await field.fill("نایین");

  const suggestion = page.getByRole("option").filter({ hasText: "نایین" }).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page).toHaveURL(/\/carpets\/[^/]+$/);
  await expect(page.getByRole("heading", { name: /نایین/ })).toBeVisible();
});

test("a name nothing matches offers a way on rather than an empty panel", async ({ page }) => {
  await page.goto("/carpets");
  await page.getByRole("button", { name: /جست‌وجو در فرش‌ها/ }).click();
  await page.getByRole("combobox", { name: /جست‌وجو در فرش‌ها/ }).fill("زرافه");

  // Scoped to the panel, and to the sentence that names what was typed. The
  // bare `/پیدا نشد/` also matches the live region that announces the same
  // thing to a screen reader, which is two elements saying one thing — right
  // for the page, ambiguous for a locator.
  const panel = page.getByRole("search");
  await expect(panel.getByText("فرشی به نام «زرافه» پیدا نشد.")).toBeVisible();
  // A dead end is the one thing a search must not be: both offers are links.
  await expect(panel.getByRole("link", { name: "همه‌ی فرش‌ها" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "عکس" })).toBeVisible();
});

test("a search that matches nothing says so instead of showing everything", async ({ page }) => {
  // Answering with the whole catalogue reads as an answer and is not one.
  await page.goto("/carpets?q=زرافه");
  await expect(page.getByRole("link", { name: CARPET.name, exact: true })).toHaveCount(0);
  await expect(page.getByText(/پیدا نشد|چیزی یافت نشد|نتیجه‌ای/)).toBeVisible();
});

test("each upload screen asks for the photograph it actually reads", async ({ page }) => {
  // The dropzone said «عکس فرش» from inside itself, which was right for visual
  // search and wrong for the two screens that read a *room* — the adviser wants
  // the floor and the walls, the size guide wants the floor and a sheet of A4.
  // Both asked for a carpet and then measured the room in whatever arrived.
  for (const [path, subject] of [
    ["/room-adviser", "عکس اتاق"],
    ["/size-guide", "عکس اتاق"],
    ["/visual-search", "عکس فرش"],
  ] as const) {
    await page.goto(`${path}?intro=0`);
    await expect(page.getByText(`${subject} را اینجا رها کنید`)).toBeVisible();
    // The spoken name too: the file input is `sr-only`, so this label is the
    // only thing a screen reader has to go on.
    await expect(page.getByLabel(`انتخاب ${subject}`)).toBeAttached();
  }
});

test("one tap on «ادامه» reaches the review step without placing the order", async ({
  page,
  isMobile,
}) => {
  // The journey test above walks the same three steps and passes, so this one
  // exists for a single difference: it **taps**. A mouse click is one event; a
  // tap is a touch sequence from which the browser then synthesises a click,
  // and it aims that synthetic click at whatever now sits under the finger. So
  // a footer button that changes identity between the two is a different bug on
  // a phone than it is on a desktop, and only the phone can show it.
  //
  // Reported from real use: the review step was reached only when the order was
  // rejected for stock — i.e. it was being submitted through, and the shopper
  // saw their invoice only on the path where the submission failed.
  test.skip(!isMobile, "the synthetic click only exists where there is a touchscreen");

  await page.goto(`/carpets/${CARPET.slug}`);
  await page.getByRole("button", { name: /افزودن به سبد/ }).click();
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem("toranjan.cart");
    return Array.isArray(JSON.parse(raw ?? "{}")?.state?.lines) && JSON.parse(raw!).state.lines.length === 1;
  });

  await page.goto("/checkout");
  await page.getByLabel("نام و نام خانوادگی").fill("علی سلطانی تهرانی");
  await page.getByLabel("شماره‌ی موبایل").fill("۰۹۱۲۳۴۵۶۷۸۹");
  await page.getByRole("button", { name: "ادامه" }).tap();

  await page.getByLabel("نشانی تحویل").fill("تهران، خیابان ولیعصر، کوچه‌ی نهم، پلاک ۱۲، واحد ۳");

  // The tap that turns «ادامه» into «ثبت سفارش». After it the buyer must be
  // *looking at* the invoice, with the order not yet made.
  await page.getByRole("button", { name: "ادامه" }).tap();

  await expect(page.getByRole("button", { name: /ثبت سفارش/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /سفارش ثبت شد/ })).toHaveCount(0);
  // Asserted on the total rather than on the step dot: the point of this step
  // is that the shopper can read what they are about to pay.
  await expect(page.getByText("جمع")).toBeVisible();
});

test("Enter in a text field cannot place the order from an earlier step", async ({ page }) => {
  // A single-line input inside a `<form>` submits it on Enter — the browser's
  // implicit submission, which no button controls and which every phone
  // keyboard offers as «رفتن». The footer button being `type="button"` does
  // nothing about it.
  //
  // So the guard cannot live on a button. Whatever the shopper presses, the
  // form must refuse to place an order from any step but the review step,
  // because that is the step where the invoice is on screen.
  await page.goto(`/carpets/${CARPET.slug}`);
  await page.getByRole("button", { name: /افزودن به سبد/ }).click();
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem("toranjan.cart");
    return Array.isArray(JSON.parse(raw ?? "{}")?.state?.lines) && JSON.parse(raw!).state.lines.length === 1;
  });

  await page.goto("/checkout");
  await page.getByLabel("نام و نام خانوادگی").fill("علی سلطانی تهرانی");
  await page.getByLabel("شماره‌ی موبایل").fill("۰۹۱۲۳۴۵۶۷۸۹");
  await page.getByRole("button", { name: "ادامه" }).click();

  // Every field is now filled, which is the state that makes this dangerous:
  // the schema validates, so nothing else stands between a stray Enter and a
  // placed order.
  await page.getByLabel("نشانی تحویل").fill("تهران، خیابان ولیعصر، کوچه‌ی نهم، پلاک ۱۲، واحد ۳");
  await page.getByRole("button", { name: "بازگشت" }).click();

  await expect(page.getByLabel("شماره‌ی موبایل")).toBeVisible();
  await page.getByLabel("شماره‌ی موبایل").press("Enter");

  // Still on the contact step, with no order behind it.
  await expect(page.getByRole("heading", { name: /سفارش ثبت شد/ })).toHaveCount(0);
  await expect(page.getByLabel("شماره‌ی موبایل")).toBeVisible();

  // Today the assertion above passes for a reason that is not the guard: the
  // contact step has two single-line inputs, and the HTML spec suppresses
  // implicit submission on a form with more than one such field and no submit
  // button. That is luck, and it turns into a bug the day this step has one
  // field. So the submit is also raised directly — the same event the browser
  // would have sent — and must still be refused.
  //
  // Asserted on the **request**, not on the screen. Watching the screen was the
  // first attempt and it was worthless: `requestSubmit()` returns immediately,
  // the POST is still in flight, and «سفارش ثبت شد» is legitimately absent for
  // a few hundred milliseconds whether or not an order is being created. The
  // assertion passed with the guard removed, which is the definition of a test
  // that proves nothing.
  const orderPosts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/orders\b/.test(request.url())) {
      orderPosts.push(request.url());
    }
  });

  await page.evaluate(() => {
    const form = document.querySelector("form");
    if (!form) throw new Error("the checkout form is not on the page");
    form.requestSubmit();
  });
  await page.waitForTimeout(1500);

  expect(orderPosts).toEqual([]);
  await expect(page.getByRole("heading", { name: /سفارش ثبت شد/ })).toHaveCount(0);
  await expect(page.getByLabel("شماره‌ی موبایل")).toBeVisible();
});
