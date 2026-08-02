"""Locate each supplied still inside the film.

The five PNGs are the moments the sequence should rest on, so the chapter stops
have to be those exact frames rather than even fifths. Matching is done on a
small greyscale thumbnail: the stills and the film come from the same render,
so a plain sum-of-squares over a 64x36 sketch separates them cleanly.
"""

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

VIDEO = Path(sys.argv[1])
STILLS = Path(sys.argv[2])
OUT = Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)

sys.stdout.reconfigure(encoding="utf-8")

W, H = 64, 36


def sketch_from_pil(img: Image.Image) -> np.ndarray:
    a = np.asarray(img.convert("L").resize((W, H), Image.LANCZOS), np.float32)
    return (a - a.mean()) / (a.std() + 1e-6)


stills = {}
for p in sorted(STILLS.glob("*.png")):
    with Image.open(p) as im:
        stills[p.stem] = sketch_from_pil(im)

cap = cv2.VideoCapture(str(VIDEO))
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
best = {k: (1e18, -1) for k in stills}

frames = []
for i in range(total):
    ok, frame = cap.read()
    if not ok:
        break
    s = sketch_from_pil(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
    frames.append(s)
    for name, ref in stills.items():
        d = float(((ref - s) ** 2).mean())
        if d < best[name][0]:
            best[name] = (d, i)
cap.release()

print(f"searched {len(frames)} frames\n")
order = sorted(best.items(), key=lambda kv: kv[1][1])
for name, (d, idx) in order:
    print(f"{name}.png -> frame {idx:3d}  ({idx / 30:.2f}s)   distance {d:.4f}")

# side-by-side proof
cap = cv2.VideoCapture(str(VIDEO))
cell = 420
sheet = Image.new("RGB", (cell * len(order), int(cell * 9 / 16) * 2), "black")
for col, (name, (_, idx)) in enumerate(order):
    with Image.open(STILLS / f"{name}.png") as im:
        im = im.convert("RGB")
        im.thumbnail((cell, cell))
        sheet.paste(im, (col * cell, 0))
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ok, frame = cap.read()
    if ok:
        m = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        m.thumbnail((cell, cell))
        sheet.paste(m, (col * cell, int(cell * 9 / 16)))
cap.release()
sheet.save(OUT / "stop-match.jpg", quality=88)
print(f"\ntop row = your stills, bottom row = matched frames -> {OUT / 'stop-match.jpg'}")
print("\nstops =", [idx for _, (_, idx) in order])
