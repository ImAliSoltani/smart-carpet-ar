"""Generate the catalogue's photographs, five per carpet, in the order that matters.

    uv run python scripts/generate_catalog_images.py --only qom-silk-lachak-sormei
    uv run python scripts/generate_catalog_images.py --limit 5
    uv run python scripts/generate_catalog_images.py            # all forty

The whole reason this is a script and not two hundred visits to a chat window is
the reference image. For each carpet the flat texture is generated first from
text alone, and then **that file is attached to the other four requests**, so the
cover, the macro, the room and the gallery are photographs *of it* rather than
four new carpets that happen to match the description. Asked separately, an
image model produces four different rugs — and a shop whose cover photo and AR
model disagree is lying in the one place the product exists to be honest.

Resumable by construction: a shot whose file already exists is skipped, so a run
that dies at carpet thirty-one costs thirty-one nothing. `--redo` forces one
carpet again when a photograph comes out wrong, which it will — the flat shot is
the fussy one and the acceptance criteria for it are in `catalog_prompts.py`.

The key comes from `GEMINI_API_KEY` in the environment or `backend/.env`, and is
never written anywhere this script controls.
"""

from __future__ import annotations

import argparse
import base64
import sys
import time
from pathlib import Path

import httpx
from catalog_profiles import PROFILES
from catalog_prompts import build_shots

# This script says most of what it says in Persian, and a Windows console
# defaults to a code page that cannot encode it — so a run that hit a quota
# died with a UnicodeEncodeError instead of printing the sentence explaining
# why. The message is the whole point of reaching that branch.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MODEL = "gemini-3.1-flash-image"
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

ROOT = Path(__file__).resolve().parents[2]
# Under `data/`, which is gitignored: two hundred PNGs are heavy and entirely
# reproducible from `dataset/` plus this script.
OUT_DIR = ROOT / "data" / "catalog-gen"

# Generous, because an image takes seconds and a timeout costs a whole retry.
REQUEST_TIMEOUT_S = 180.0
# The free tier counts requests per minute; this keeps a long run under it
# without needing to parse the quota back out of the headers.
PAUSE_S = 6.0
MAX_ATTEMPTS = 3


def api_key() -> str:
    import os

    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    env = Path(__file__).resolve().parents[1] / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit(
        "GEMINI_API_KEY نیست. در backend/.env بگذارید یا در محیط تعریف کنید."
    )


class QuotaExhausted(RuntimeError):
    """A ceiling that waiting will not clear. Ends the run rather than the shot."""


def _quota_details(response: httpx.Response) -> tuple[list[str], int | None]:
    """Which quotas a 429 blamed, and how long it asked us to wait.

    Google says both in the error body and neither in a header, so this reads
    them out rather than guessing — the guess was 30/60/90 seconds against a
    daily limit, which is three minutes spent learning nothing.
    """
    try:
        details = response.json().get("error", {}).get("details", [])
    except Exception:  # noqa: BLE001 — a body that will not parse says nothing
        return [], None

    violated: list[str] = []
    retry_after: int | None = None
    for detail in details:
        kind = detail.get("@type", "")
        if "QuotaFailure" in kind:
            violated += [v.get("quotaId", "") for v in detail.get("violations", [])]
        elif "RetryInfo" in kind:
            raw = str(detail.get("retryDelay", "")).rstrip("s")
            retry_after = int(float(raw)) + 2 if raw else None
    return violated, retry_after


def request_image(
    client: httpx.Client, key: str, prompt: str, reference: bytes | None
) -> bytes:
    """One image. `reference` is the flat shot, attached for every shot but it."""
    parts: list[dict] = [{"text": prompt}]
    if reference is not None:
        # The image goes *before* the instruction: the model reads the parts in
        # order, and an instruction that says «the attached rug» before anything
        # is attached is an instruction about nothing.
        parts.insert(
            0,
            {
                "inline_data": {
                    "mime_type": "image/png",
                    "data": base64.b64encode(reference).decode(),
                }
            },
        )

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }

    last: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = client.post(
                ENDPOINT, headers={"x-goog-api-key": key}, json=body,
                timeout=REQUEST_TIMEOUT_S,
            )
            if response.status_code == 429:
                # Two very different things arrive as 429, and treating them the
                # same wastes minutes proving something that cannot change: a
                # per-minute ceiling clears itself, a per-day one does not.
                violated, retry_after = _quota_details(response)
                if any("PerDay" in q for q in violated):
                    raise QuotaExhausted(
                        "سقف روزانه‌ی این مدل تمام شده است. صبر کردن کمکی نمی‌کند — "
                        "یا فردا، یا صورت‌حساب پروژه را فعال کنید."
                    )
                wait = retry_after or 30 * attempt
                print(f"    per-minute quota, waiting {wait}s")
                time.sleep(wait)
                continue
            response.raise_for_status()
            payload = response.json()

            for candidate in payload.get("candidates", []):
                for part in candidate.get("content", {}).get("parts", []):
                    blob = part.get("inlineData") or part.get("inline_data")
                    if blob and blob.get("data"):
                        return base64.b64decode(blob["data"])

            # A response with no image is usually a refusal or a safety block,
            # and the reason is worth seeing rather than retrying blindly.
            reason = payload.get("candidates", [{}])[0].get("finishReason", "?")
            raise RuntimeError(f"no image in response (finishReason={reason})")
        except QuotaExhausted:
            raise
        except Exception as exc:  # noqa: BLE001 — every failure retries the same way
            last = exc
            if attempt < MAX_ATTEMPTS:
                print(f"    attempt {attempt} failed: {exc}")
                time.sleep(5 * attempt)
    raise RuntimeError(f"gave up after {MAX_ATTEMPTS} attempts: {last}")


def run(only: str | None, limit: int | None, redo: bool) -> int:
    key = api_key()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    profiles = [p for p in PROFILES if only is None or p.slug == only]
    if only and not profiles:
        raise SystemExit(f"اسلاگ پیدا نشد: {only}")
    if limit:
        profiles = profiles[:limit]

    made = skipped = failed = 0
    with httpx.Client() as client:
        for number, profile in enumerate(profiles, start=1):
            print(f"[{number}/{len(profiles)}] {profile.slug}")
            reference: bytes | None = None

            for shot in build_shots(profile):
                path = OUT_DIR / f"{profile.slug}__{shot.name}.png"

                if path.exists() and not redo:
                    # Still needed as the reference for the shots after it, so
                    # a resumed run does not silently switch to no reference.
                    if shot.name == "flat":
                        reference = path.read_bytes()
                    skipped += 1
                    continue

                if shot.needs_reference and reference is None:
                    print(f"    {shot.name}: no flat image to work from, skipping")
                    failed += 1
                    continue

                try:
                    image = request_image(
                        client, key, shot.prompt, reference if shot.needs_reference else None
                    )
                except QuotaExhausted as exc:
                    print(f"\n{exc}")
                    print(f"made={made} skipped={skipped} failed={failed} — resumable")
                    return 3
                except Exception as exc:  # noqa: BLE001
                    print(f"    {shot.name}: FAILED — {exc}")
                    failed += 1
                    continue

                path.write_bytes(image)
                if shot.name == "flat":
                    reference = image
                made += 1
                print(f"    {shot.name}: {len(image) // 1024} KB")
                time.sleep(PAUSE_S)

    print(f"\nmade={made} skipped={skipped} failed={failed}")
    print(f"in {OUT_DIR}")
    return 0 if failed == 0 else 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", help="یک اسلاگ، برای آزمودن")
    parser.add_argument("--limit", type=int, help="فقط N فرش اول")
    parser.add_argument(
        "--redo", action="store_true", help="فایل‌های موجود را هم دوباره بساز"
    )
    args = parser.parse_args()
    return run(args.only, args.limit, args.redo)


if __name__ == "__main__":
    sys.exit(main())
