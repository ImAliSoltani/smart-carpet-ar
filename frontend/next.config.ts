import type { NextConfig } from "next";

/** Where this server forwards to. Same variable the API client's server half reads. */
const apiBase = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /**
   * Stored files are served from the site's own origin.
   *
   * The backend's storage contract already publishes every file under `/files`,
   * and in production Caddy puts the API, MinIO and the site behind one host —
   * so `/files/…` is genuinely same-origin there. Development is the odd one
   * out, with the API on another port, and this proxy is what makes the two
   * environments agree instead of the code carrying an origin around.
   *
   * It also settles `next/image`: Next 16 refuses to optimise an upstream that
   * resolves to a private address, which is exactly what a local backend is. As
   * a same-origin path the images optimise normally, which matters because the
   * API stores one derivative per photo (800px) and the responsive sizes below
   * that have to come from somewhere.
   */
  /**
   * The API is reached through this server too, not just the stored files.
   *
   * A browser that talks straight to `http://localhost:8000` only works on the
   * machine running it. Open the site from a phone on the same network and the
   * page loads while every request dies, because `localhost` there is the
   * phone. Proxying means the browser only ever addresses the origin it was
   * served from, whatever device that is — and it removes the CORS round trip
   * along with the problem.
   *
   * Production changes nothing: Caddy already puts the site, the API and the
   * files behind one host, so same-origin is what ships.
   */
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/files/:path*", destination: `${apiBase}/files/:path*` },
    ];
  },
};

export default nextConfig;
