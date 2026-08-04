import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/** Where this server forwards to. Same variable the API client's server half reads. */
const apiBase = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000"
).replace(/\/+$/, "");

/**
 * Every address this machine answers on.
 *
 * Read from the interfaces rather than written down, because the laptop has
 * four of them and the one the router hands out changes. A list typed into
 * this file is a list that is wrong the next time DHCP renews.
 */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((addrs) => addrs ?? [])
    .filter((a) => a.family === "IPv4" && !a.internal)
    .map((a) => a.address);
}

const nextConfig: NextConfig = {
  /**
   * Hosts allowed to pull `/_next/*` in development.
   *
   * Without this the site opens from a phone and stays empty: Next blocks its
   * dev resources for any origin but localhost, so the HTML arrives, the
   * JavaScript bundle does not, React never hydrates, and no request is ever
   * made. It reads as a database that will not load, which is what it was
   * mistaken for. Development only — the production build serves its assets
   * to anyone.
   */
  allowedDevOrigins: lanAddresses(),

  /**
   * The API and the stored files are both reached through this server.
   *
   * The backend's storage contract already publishes every file under `/files`,
   * and in production Caddy puts the site, the API and MinIO behind one host —
   * so same-origin is what ships. Development is the odd one out, with the API
   * on another port, and this proxy is what makes the two agree instead of the
   * code carrying an origin around. It is also what lets another device open
   * the site at all: a browser told to call `http://localhost:8000` on a phone
   * is calling the phone.
   *
   * It settles `next/image` as well. Next 16 refuses to optimise an upstream
   * that resolves to a private address, which is exactly what a local backend
   * is; as a same-origin path the images optimise normally, and that matters
   * because the API stores one derivative per photo and the smaller responsive
   * sizes have to come from somewhere.
   */
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/files/:path*", destination: `${apiBase}/files/:path*` },
    ];
  },
};

export default nextConfig;
