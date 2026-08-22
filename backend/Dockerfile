# The API, with the models it needs baked in.
#
# Two things in here are not the obvious way round, and both are about the
# same thing — a container that starts must be able to answer, offline:
#
# 1. **The CPU wheels of torch, chosen explicitly.** The default index serves
#    the CUDA build, which drags in several gigabytes of driver libraries this
#    server has no GPU to use.
# 2. **DINOv2 downloaded at build time, not at first request.** `torch.hub.load`
#    fetches from GitHub the first time it runs. Left to run time that is a
#    network call on the critical path of the first shopper's search, on a box
#    that may sit behind a filtered connection — and it fails as a 500 with a
#    stack trace about a URL, long after deployment looked successful.

FROM python:3.12-slim-bookworm AS base

# libGL/libglib: opencv-python-headless still links the GL and glib runtimes.
# curl: the health check below.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    # torch.hub caches here; the model is fetched during the build and this is
    # the path that has to match at run time.
    TORCH_HOME=/opt/torch

WORKDIR /app

# Dependencies before source, so editing a route does not reinstall torch.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --group ml \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        --index-strategy unsafe-best-match

# Bake the weights. `trust_repo` is set because the build is non-interactive and
# would otherwise block on a prompt nobody can answer.
RUN python -c "import torch; torch.hub.load('facebookresearch/dinov2', 'dinov2_vitb14', trust_repo=True)"

COPY . .
RUN uv sync --frozen --group ml \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        --index-strategy unsafe-best-match

# Files the app writes are the only mutable state in the image; everything else
# is read-only to whoever runs it.
RUN useradd --create-home --uid 10001 farsh \
    && mkdir -p /app/data/storage \
    && chown -R farsh:farsh /app/data
USER farsh

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# `--proxy-headers` is what makes `request.client` the real visitor rather than
# Caddy, which is what the rate limiter keys on. **Which** senders are believed
# is not decided here: uvicorn reads `FORWARDED_ALLOW_IPS` from the environment,
# and the compose file sets it to Caddy's one fixed address. Baking `*` in
# would mean trusting `X-Forwarded-For` from anyone who reaches this port, and
# a limiter keyed on a value the caller chooses is not a limiter.
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
