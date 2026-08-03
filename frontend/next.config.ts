import type { NextConfig } from "next";

/** Origin of the API. Kept in step with the API client's own default. */
const apiBase = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
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
  async rewrites() {
    return [{ source: "/files/:path*", destination: `${apiBase}/files/:path*` }];
  },
};

export default nextConfig;
