# The storefront, built once and served from Next's standalone output.
#
# `output: "standalone"` (see next.config.ts) is what makes the runtime stage
# possible: Next traces the modules the server actually imports and writes a
# self-contained tree, so the image carries neither `node_modules` nor the
# toolchain. Without it the runtime stage would need the full dependency tree,
# which is most of a gigabyte of build-time-only packages.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Baked into the bundle at build time, so it has to be right here rather than
# at `docker run`. It is a *path*, not an origin: the site, the API and the
# stored files all sit behind one Caddy host in production, so the browser
# talks to its own origin and nothing has to know the backend's address.
ARG NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
# Turns on `output: "standalone"` in next.config.ts. Set here rather than there
# so that `next start` — which the E2E suite and scripts/share.ps1 both use —
# is not permanently warning about a mode only this build wants.
ENV NEXT_OUTPUT_STANDALONE=1

RUN npm run build


FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The three pieces standalone output needs, and nothing else. `.next/static`
# and `public` are not traced into the server bundle — they are served from
# disk — so they are copied separately or the site renders without stylesheets.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
