"""Hardening that belongs to the whole application rather than one route.

Three things live here, and each one closes a hole that was found by reading
the code the way an attacker would rather than the way its author does.

1. **Response headers.** The API answers JSON and, in development, also serves
   the uploaded files. Both need telling the browser what they are not.
2. **A body-size ceiling that acts before the body is read.** Four endpoints
   checked the size *after* `await file.read()`, which is a check that runs once
   the damage is done.
3. **A rate limiter the expensive endpoints can share.** Login was the only
   thing limited, and login is the cheapest thing here.

Everything is in-process and per-worker, which matches the deployment the
roadmap chose (§4: one container, no Redis). The limits are therefore per
worker, and that is written into the numbers rather than pretended away.
"""

from __future__ import annotations

import json
import time
from collections import defaultdict

from fastapi import HTTPException, Request, UploadFile, status
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# --- response headers -------------------------------------------------------

#: Sent on every response.
#:
#: `nosniff` is the one that matters most here. The storefront and the API share
#: an origin in production, and `/files` serves bytes a stranger uploaded; a
#: browser that is willing to guess a content type is a browser that can be
#: talked into running one. `frame-ancestors 'none'` is spelled in CSP rather
#: than `X-Frame-Options` because the AR page is the only thing anyone would
#: want to embed and it must not be embeddable — an invisible frame over a
#: camera permission prompt is the whole clickjacking family.
BASE_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
    # The API needs no camera, microphone or location. The *storefront* does ask
    # for the camera — that is Next.js's own origin and its own header; this one
    # only speaks for the API, and denying here costs nothing.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
}

#: Added only when the app is not in debug, i.e. when it is behind Caddy on
#: HTTPS. Sending HSTS from a plain-http development server would pin the
#: developer's browser to https://localhost and break the next `npm run dev`.
HSTS_HEADER = ("Strict-Transport-Security", "max-age=31536000; includeSubDomains")


class SecurityHeadersMiddleware:
    """Pure ASGI so the headers are attached to *every* response.

    A `BaseHTTPMiddleware` subclass would miss the ones Starlette produces
    without passing through the request/response cycle — notably `StaticFiles`,
    which is exactly the mount serving stranger-supplied bytes.
    """

    def __init__(self, app: ASGIApp, *, hsts: bool = False) -> None:
        self.app = app
        self.hsts = hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in BASE_HEADERS.items():
                    headers.setdefault(name, value)
                if self.hsts:
                    headers.setdefault(*HSTS_HEADER)
            await send(message)

        await self.app(scope, receive, send_with_headers)


# --- request size -----------------------------------------------------------


class BodySizeLimitMiddleware:
    """Refuse an oversized request body, twice.

    The `Content-Length` check is the cheap one and catches an honest client.
    The streaming count is the one that matters: a chunked upload carries no
    length, and a dishonest one carries whichever length it likes. Counting the
    bytes as they arrive means the connection is dropped after `max_bytes`
    rather than after however many the sender felt like sending.
    """

    def __init__(self, app: ASGIApp, *, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {k.decode("latin-1").lower(): v for k, v in scope.get("headers", [])}
        declared = headers.get("content-length")
        if declared is not None:
            try:
                if int(declared) > self.max_bytes:
                    await _too_large(send)
                    return
            except ValueError:
                pass  # a malformed length is the parser's problem, not ours

        received = 0

        async def counting_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _BodyTooLarge
            return message

        try:
            await self.app(scope, counting_receive, send)
        except _BodyTooLarge:
            await _too_large(send)


class _BodyTooLarge(Exception):
    pass


#: The 413 body, written out here rather than built per request. It is escaped
#: ASCII because this is emitted below the framework — there is no response
#: model to serialise it, and a raw UTF-8 literal would depend on the file's
#: encoding surviving every tool between here and the socket.
_TOO_LARGE_BODY = json.dumps(
    {"detail": "حجم درخواست بیش از حد مجاز است"}, ensure_ascii=True
).encode("ascii")


async def _too_large(send: Send) -> None:
    body = _TOO_LARGE_BODY
    await send(
        {
            "type": "http.response.start",
            "status": status.HTTP_413_CONTENT_TOO_LARGE,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})


#: Read size for `read_upload`. Small enough that the overshoot past the limit
#: is negligible, large enough not to turn a 25 MB upload into 25 000 awaits.
CHUNK_BYTES = 256 * 1024


async def read_upload(file: UploadFile, *, max_bytes: int) -> bytes:
    """Read an upload, stopping as soon as it is too big.

    `await file.read()` reads to the end and *then* the caller checks — which is
    what all four upload endpoints did. Starlette spools past a threshold, so
    the cost of the old shape was not memory but disk: a request could write an
    arbitrary amount into the container's temp directory before being told 413.
    """
    chunks: list[bytes] = []
    total = 0
    while chunk := await file.read(CHUNK_BYTES):
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status.HTTP_413_CONTENT_TOO_LARGE,
                detail="حجم تصویر بیش از حد مجاز است",
            )
        chunks.append(chunk)
    return b"".join(chunks)


# --- rate limiting ----------------------------------------------------------


class SlidingWindowLimiter:
    """Sliding-window counter, one instance per thing worth limiting.

    Named buckets rather than one global count, because the limits protect
    different resources and want different numbers: a login attempt costs a
    bcrypt round, a visual search costs a forward pass through DINOv2, and a
    size-guide costs four seconds of a depth model. Sharing a budget between
    them would either strangle browsing or leave the models exposed.
    """

    #: What a caller over budget is told when the bucket does not say otherwise.
    #: Phrased for the resource-protection case, which is what most buckets are.
    DEFAULT_DETAIL = "درخواست‌های شما بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید"

    def __init__(
        self,
        *,
        limit: int,
        window_seconds: float,
        name: str,
        detail: str | None = None,
    ) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.name = name
        # A bucket that counts *failed logins* is not throttling a resource, it
        # is refusing a guess, and «درخواست‌های شما بیش از حد مجاز است» describes
        # the wrong thing to the one person this product's panel belongs to. The
        # sentence belongs to the bucket rather than to the endpoint because the
        # endpoint never sees this path — `check` raises straight past it.
        self.detail = detail or self.DEFAULT_DETAIL
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, client_key: str, *, record: bool = True) -> None:
        """Raise 429 if the caller is over budget, and by default count this call.

        `record=False` is for the case where only *failures* should count — the
        admin login uses it, so a shopkeeper who signs in correctly ten times in
        a morning is not locked out of their own shop by having used it.
        """
        now = time.monotonic()
        recent = [t for t in self._hits[client_key] if now - t < self.window_seconds]
        self._hits[client_key] = recent
        if len(recent) >= self.limit:
            retry_after = max(1, int(self.window_seconds - (now - recent[0])))
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                detail=self.detail,
                headers={"Retry-After": str(retry_after)},
            )
        if record:
            recent.append(now)

    def record(self, client_key: str) -> None:
        """Charge one hit without checking — the failed-login path."""
        self._hits[client_key].append(time.monotonic())

    def reset(self) -> None:
        """Test hook. Nothing in the application calls this."""
        self._hits.clear()


def client_key(request: Request) -> str:
    """Who to charge a request to.

    `request.client.host` and nothing else. `X-Forwarded-For` is not read here
    on purpose: it is a header, so anyone can write it, and a limiter keyed on a
    value the attacker chooses is a limiter with an unlimited number of keys.
    The proxy's address is supplied to uvicorn instead (`--proxy-headers
    --forwarded-allow-ips`, set in the deployment compose file), which rewrites
    `client` from the header only when the connection really came from Caddy.
    """
    return request.client.host if request.client else "unknown"


#: One shared forward pass through DINOv2, ~0.3 s warm. Twenty a minute is far
#: more than a person uploading photographs, and far less than what it takes to
#: keep every worker busy.
visual_search_limiter = SlidingWindowLimiter(limit=20, window_seconds=60, name="visual-search")

#: Depth estimation plus floor fitting, measured at ~4 s per photograph
#: (فاز ۴ بند ۲). Ten a minute already means a worker spending most of its time
#: here, so this is the tightest of the three.
room_limiter = SlidingWindowLimiter(limit=10, window_seconds=60, name="room")

#: The conversational planner is cheap on the rule-based default and costs an
#: outbound API call when a key is configured — so the limit exists to protect
#: someone else's bill as much as this server's CPU.
conversational_limiter = SlidingWindowLimiter(limit=30, window_seconds=60, name="conversational")
