"""Turn the intro film into the frame sets the page actually loads.

Scrolling a <video> is unreliable on iOS Safari, so the sequence is served as
still frames and drawn to a canvas instead: every position maps to one frame,
forwards and backwards, on every browser.

Four sets are produced — AVIF and WebP, at two widths — so the browser can take
the format it decodes and the size its screen can show. Neither choice belongs
in the page at runtime.

Quality is measured, not assumed: each encode is compared with the resized
source frame by PSNR, so the report shows whether AVIF is smaller *at the same
fidelity* rather than smaller because it discarded detail.

    uv run --group ml python scripts/extract_intro_frames.py \
        assets/film.mp4 docs/prototypes/intro/frames 137
"""

import math
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

# Phones are at most ~1440 physical pixels wide and the film is letterboxed
# across that width, so 1280 is native for nearly all of them; 1920 is the
# ceiling the source itself imposes.
WIDTHS = (1280, 1920)

# AVIF's quality scale is not WebP's. These two were chosen to land on the same
# measured PSNR, which is what makes the size comparison meaningful.
FORMATS = {
    "avif": (".avif", {"format": "AVIF", "quality": 62, "speed": 4}),
    "webp": (".webp", {"format": "WEBP", "quality": 80, "method": 6}),
}

# The sequence rests on five frames and races past the rest. The resting frames
# are served from the sets above at full quality; everything between them comes
# from these, which are smaller and softer in a way that is measurable but — as
# checked side by side — not visible while the camera is moving. Cutting them
# took the film from 14 MB to under 5.
MOTION = {
    "motion-1280": (1280, {"format": "AVIF", "quality": 45, "speed": 5}),
    "motion-960": (960, {"format": "AVIF", "quality": 45, "speed": 5}),
}


def psnr(a: np.ndarray, b: np.ndarray) -> float:
    mse = float(np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2))
    return 99.0 if mse == 0 else 20 * math.log10(255.0) - 10 * math.log10(mse)


def sample_frames(video: Path, count: int) -> list[Image.Image]:
    """Read the film once and keep the wanted frames.

    Seeking per frame is slow and, on some codecs, lands on the wrong picture.
    """
    cap = cv2.VideoCapture(str(video))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total <= 0:
        raise SystemExit(f"cannot read {video}")

    wanted = [round(i * (total - 1) / (count - 1)) for i in range(count)]
    keep: dict[int, Image.Image] = {}
    target = set(wanted)
    cursor = 0
    while cursor < total:
        ok, frame = cap.read()
        if not ok:
            break
        if cursor in target:
            keep[cursor] = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        cursor += 1
    cap.release()

    if not keep:
        raise SystemExit("no frames decoded")
    return [keep[min(keep, key=lambda k: abs(k - i))] for i in wanted]


def encode_set(
    frames: list[Image.Image], folder: Path, ext: str, kwargs: dict
) -> tuple[int, float]:
    folder.mkdir(parents=True, exist_ok=True)
    for stale in folder.glob(f"f-*{ext}"):
        stale.unlink()
    reference = [np.asarray(f) for f in frames]

    def encode(i: int) -> tuple[int, float]:
        path = folder / f"f-{i:03d}{ext}"
        frames[i].save(path, **kwargs)
        with Image.open(path) as decoded:
            return path.stat().st_size, psnr(reference[i], np.asarray(decoded.convert("RGB")))

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(encode, range(len(frames))))
    return sum(r[0] for r in results), sum(r[1] for r in results) / len(results)


def main() -> None:
    video = Path(sys.argv[1])
    out_root = Path(sys.argv[2])
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 137

    frames = sample_frames(video, count)
    source_w = frames[0].width
    print(f"source {source_w}x{frames[0].height}, sampled {len(frames)} frames\n")

    for width in WIDTHS:
        if width > source_w:
            print(f"skipped {width}px — the film is only {source_w}px wide\n")
            continue
        height = round(frames[0].height * width / source_w)
        resized = [f.resize((width, height), Image.LANCZOS) for f in frames]

        for name, (ext, kwargs) in FORMATS.items():
            total, quality = encode_set(resized, out_root / f"{name}-{width}", ext, kwargs)
            print(
                f"{name}-{width}: {total / 1_048_576:5.1f} MB total, "
                f"{total / len(resized) / 1024:5.1f} KB/frame, PSNR {quality:.1f} dB"
            )
        print()

    for folder, (width, kwargs) in MOTION.items():
        if width > source_w:
            continue
        height = round(frames[0].height * width / source_w)
        resized = [f.resize((width, height), Image.LANCZOS) for f in frames]
        total, quality = encode_set(resized, out_root / folder, ".avif", kwargs)
        print(
            f"{folder}: {total / 1_048_576:5.1f} MB total, "
            f"{total / len(resized) / 1024:5.1f} KB/frame, PSNR {quality:.1f} dB"
        )

    print("\nPSNR compares each encode with the resized source frame.")
    print("Equal PSNR at a smaller size means the same picture in fewer bytes.")

    prune(out_root, count)


# The five frames the sequence is allowed to rest on. Kept here as well as in
# the page because this script is what decides which files survive, and a prune
# that disagreed with the player would delete frames it then asks for.
STOPS = (0, 38, 75, 105, 136)


def prune(out_root: Path, count: int) -> None:
    """Delete what the page will never ask for.

    The four sets above are produced so the encodes can be *compared* — that is
    the point of measuring PSNR. What actually ships is narrower, and leaving
    the rest behind means carrying tens of megabytes to a server to serve none
    of it.

    Two rules, both taken from how the player fetches:

    - In hybrid mode — every browser that decodes AVIF, which is all of them
      that matter now — the five resting frames come from `avif-*` and all 132
      others come from `motion-*`. So the AVIF sets need those five files and
      nothing else.
    - The WebP sets exist only for a browser too old for AVIF. That is a rare
      visitor and one width serves them; `webp-1920` is the single largest
      folder produced and would be downloaded by almost nobody.
    """
    freed = 0
    kept = 0

    for folder in out_root.glob("avif-*"):
        for path in folder.glob("f-*"):
            index = int(path.stem.split("-")[1])
            if index in STOPS:
                kept += 1
                continue
            freed += path.stat().st_size
            path.unlink()

    wide = out_root / "webp-1920"
    if wide.is_dir():
        for path in wide.glob("f-*"):
            freed += path.stat().st_size
            path.unlink()
        wide.rmdir()

    remaining = sum(p.stat().st_size for p in out_root.rglob("f-*"))
    print(
        f"\npruned {freed / 1_048_576:.1f} MB the page never requests "
        f"({kept} resting frames kept per AVIF set, webp-1920 dropped)"
    )
    shipped = len(list(out_root.rglob("f-*")))
    print(f"shipping {remaining / 1_048_576:.1f} MB across {shipped} files")


if __name__ == "__main__":
    main()
