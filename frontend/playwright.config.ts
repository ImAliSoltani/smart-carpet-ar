import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke, as ROADMAP §8 فاز ۵ asks: the buying flow and the admin
 * sign-in, driven through a real browser against a real backend.
 *
 * **What this layer is for, and what it is not.** There are 150-odd backend
 * tests and they already prove the API. What none of them can see is the join:
 * whether the button a shopper presses reaches the route that was tested,
 * whether the cart survives the navigation to checkout, whether the session
 * cookie the API sets is one this browser will send back. Every bug this file
 * has caught so far lived in that seam, which is why the specs are deliberately
 * few and end to end rather than many and shallow.
 *
 * Both servers are started by Playwright itself (`webServer` below) so that
 * `npm run e2e` is the whole command locally and in CI alike.
 */

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
const API_PORT = Number(process.env.E2E_API_PORT ?? 8100);
const API_URL = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The shop leaves rows behind — an order, a carpet — and two workers running
  // the same flow would each see the other's. Serial is also fast enough: the
  // whole suite is a handful of journeys.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    // RTL Persian is the only locale this product has; running the browser in
    // it means a date or a number formatted by the *browser* is formatted the
    // way a real visitor sees it.
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // The shop is mobile-first (§3-5) and the cart lives in a drawer there, so
    // a desktop-only run would never open it.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: [
    {
      // Ports are E2E-specific so a run never collides with the dev server the
      // developer already has open — and never writes into the database they
      // are browsing: E2E_DATABASE_URL points at `farsh_e2e`.
      command: "npm run e2e:api",
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      // `next start`, not `next dev`: the production build is what ships, and
      // the two differ in exactly the places that break — prerendering, image
      // optimisation, and which errors are swallowed.
      command: `npm run build && npx next start --port ${WEB_PORT}`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        API_INTERNAL_URL: API_URL,
        NEXT_PUBLIC_API_BASE_URL: "/api",
      },
    },
  ],
});
