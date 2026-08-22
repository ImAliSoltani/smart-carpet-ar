/**
 * Bring up an API for the browser tests: migrate, seed, serve.
 *
 * A Node script rather than a line of shell in package.json, because the same
 * command has to work in PowerShell on the development machine and in bash on
 * the CI runner, and because three steps have to happen in order and stop on the
 * first failure.
 *
 * Three things it deliberately does NOT share with the developer's own server:
 *
 * - **Its own database** (`farsh_e2e`). The seed truncates the catalogue, and a
 *   suite pointed at the database someone is browsing would empty it.
 * - **Its own port** (8100), so a run never collides with a dev server already
 *   open, and its own storage directory for the same reason.
 * - **`DEBUG=false`**, so the tests exercise the production branches — hidden
 *   docs, the real header set, the startup configuration check. The one
 *   production behaviour that is switched off is the `Secure` flag on the
 *   session cookie: a browser will not store one over plain http, so with it on
 *   the admin sign-in test would fail for a reason that has nothing to do with
 *   the admin sign-in. That is exactly the case `SESSION_COOKIE_SECURE` was
 *   added for.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, "../../backend");

const port = process.env.E2E_API_PORT ?? "8100";
const database =
  process.env.E2E_DATABASE_URL ??
  "postgresql+asyncpg://farsh:farsh@localhost:5432/farsh_e2e";

const env = {
  ...process.env,
  DATABASE_URL: database,
  DEBUG: "false",
  SESSION_COOKIE_SECURE: "false",
  SESSION_SECRET: "e2e-secret-not-a-real-one",
  ADMIN_USERNAME: "admin",
  // bcrypt of "e2e-password", cost 4 — cheap on purpose, and it never leaves
  // this file or reaches a deployed machine.
  ADMIN_PASSWORD_HASH:
    process.env.E2E_ADMIN_PASSWORD_HASH ??
    "$2b$04$GRIhwfBaJDr2v7GDP8JURu5rUByFxLzp32g.RjzboVUpxi0NNJ3lO",
  STORAGE_DIR: "data/e2e-storage",
  CORS_ORIGINS: `http://127.0.0.1:${process.env.E2E_WEB_PORT ?? "3100"}`,
};

/** Run one command to completion; reject on a non-zero exit. */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: backend, env, stdio: "inherit", shell: true });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} → exit ${code}`)),
    );
  });
}

await run("uv", ["run", "python", "scripts/create_e2e_database.py"]);
await run("uv", ["run", "alembic", "upgrade", "head"]);
await run("uv", ["run", "python", "scripts/seed_e2e.py"]);

// Replaces this process so Playwright's shutdown signal reaches uvicorn.
const server = spawn(
  "uv",
  ["run", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", port],
  { cwd: backend, env, stdio: "inherit", shell: true },
);
process.on("SIGINT", () => server.kill("SIGINT"));
process.on("SIGTERM", () => server.kill("SIGTERM"));
server.on("exit", (code) => process.exit(code ?? 0));
