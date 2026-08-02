"""Turn the intro film into a scrubbable frame sequence.

Scrolling a <video> is unreliable on iOS Safari, so the sequence is served as
still frames and drawn to a canvas instead: every scroll position maps to one
frame, forwards and backwards, on every browser.
"""

import sys
from io import BytesIO
from pathlib import Path

import cv2
from PIL import Image

src = Path(sys.argv[1])
out = Path(sys.argv[2])
COUNT = int(sys.argv[3]) if len(sys.argv) > 3 else 96
WIDTH = int(sys.argv[4]) if len(sys.argv) > 4 else 1280
QUALITY = int(sys.argv[5]) if len(sys.argv) > 5 else 70

out.mkdir(parents=True, exist_ok=True)
for old in out.glob("f-*.webp"):
    old.unlink()

cap = cv2.VideoCapture(str(src))
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
picks = [round(i * (total - 1) / (COUNT - 1)) for i in range(COUNT)]

written = 0
size = 0
for i, f in enumerate(picks):
    cap.set(cv2.CAP_PROP_POS_FRAMES, f)
    ok, frame = cap.read()
    if not ok:
        continue
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    img.thumbnail((WIDTH, WIDTH * 10), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, "WEBP", quality=QUALITY, method=6)
    path = out / f"f-{i:03d}.webp"
    path.write_bytes(buf.getvalue())
    written += 1
    size += path.stat().st_size

cap.release()
print(f"{written} frames at {WIDTH}px q{QUALITY}")
print(f"total {size / 1024 / 1024:.2f} MB   average {size / written / 1024:.0f} KB")
