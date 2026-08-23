import { expect, test } from "@playwright/test";

/**
 * The shopkeeper's side: signing in, and the guard that stands in front of it.
 *
 * The API's own tests already prove the session cookie is signed and checked.
 * What only a browser can prove is that the cookie survives the round trip —
 * `HttpOnly`, `SameSite=Lax`, and the `Secure` flag that a browser silently
 * refuses to store over plain http. Every one of those is invisible to a
 * `TestClient` and fatal in a browser.
 */

const CREDENTIALS = { username: "admin", password: "e2e-password" };

test("the panel is closed to a visitor who is not signed in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("a wrong password is refused, and says nothing about which half was wrong", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await page.getByLabel(/نام کاربری/).fill(CREDENTIALS.username);
  await page.getByLabel(/رمز/).fill("definitely-not-it");
  await page.getByRole("button", { name: /ورود/ }).click();

  // Scoped to the form: Next's route announcer is an empty `role="alert"` on
  // every page, so an unscoped one matches two elements and neither is this.
  const errorBox = page.locator("main").getByRole("alert");
  const wrongPassword = await errorBox.innerText();
  expect(wrongPassword).toMatch(/نادرست/);
  await expect(page).toHaveURL(/\/admin\/login/);

  // The same message for a username that does not exist. A pair of messages
  // that differ tells an attacker when they have found a real account.
  await page.getByLabel(/نام کاربری/).fill("someone-else");
  await page.getByLabel(/رمز/).fill(CREDENTIALS.password);
  await page.getByRole("button", { name: /ورود/ }).click();
  await expect(errorBox).toHaveText(wrongPassword);
});

test("the shopkeeper signs in, sees the dashboard, and signs out again", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel(/نام کاربری/).fill(CREDENTIALS.username);
  await page.getByLabel(/رمز/).fill(CREDENTIALS.password);
  await page.getByRole("button", { name: /ورود/ }).click();

  await expect(page).toHaveURL(/\/admin(?!\/login)/);
  await expect(page.getByRole("heading", { name: /داشبورد/ })).toBeVisible();

  // The session is a cookie the browser sends back, so a fresh navigation is
  // the only honest test that it is still signed in.
  await page.goto("/admin/carpets");
  await expect(page.getByRole("heading", { name: /فرش/ }).first()).toBeVisible();

  // Not readable from JavaScript — the property that makes an XSS on the
  // storefront unable to walk away with admin access.
  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "farsh_admin_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
});

test("the login page refuses to bounce to another origin", async ({ page }) => {
  // `?next=` is followed after a successful sign-in, so an unchecked one turns
  // the shop's own login into a redirector for somebody else's page.
  await page.goto("/admin/login?next=https://evil.example/steal");
  await page.getByLabel(/نام کاربری/).fill(CREDENTIALS.username);
  await page.getByLabel(/رمز/).fill(CREDENTIALS.password);
  await page.getByRole("button", { name: /ورود/ }).click();

  await expect(page).not.toHaveURL(/evil\.example/);
});

test("the panel installs as its own app, not as the shop", async ({ page }) => {
  // Installed from this screen, the shopkeeper must get the panel: its own
  // name, its own dark tile, and a `start_url` inside `/admin`. Pointing at the
  // root manifest would hand them the storefront — an app that opens on the
  // catalogue they were trying to get away from.
  await page.goto("/admin/login");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/admin/manifest.webmanifest");

  const response = await page.request.get(href!);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = await response.json();

  expect(manifest.start_url).toBe("/admin");
  // `scope` is what keeps a link out to the storefront from opening inside the
  // panel's window wearing the panel's theme colour.
  expect(manifest.scope).toBe("/admin");
  // Told apart from the shop's manifest by `id`; without one the browser falls
  // back to `start_url` and a later change to it installs a second copy.
  expect(manifest.id).toBe("/admin");
  expect(manifest.icons.map((i: { src: string }) => i.src)).toContain(
    "/brand/admin-icon-512.png",
  );

  // Every icon it promises has to exist. A manifest listing a 404 installs
  // anyway, with a blank tile.
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await page.request.get(icon.src)).status()).toBe(200);
  }

  // And the shop is still its own app.
  await page.goto("/?intro=0");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
});
