"""Measure the A4 scale reference over a sweep of synthetic rooms.

    uv run python scripts/eval_sizing.py

Reports how often the sheet is found and how far the recovered scale is from the
truth, split by the two things that vary between photographs — how wrong the
depth estimate was, and how skewed the sheet is in the frame. The split matters
more than the average: a method that is exact head-on and useless at 40° has the
same mean as one that is mediocre everywhere, and only the first is fixable.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.eval.sizing import Report, default_scenes, run  # noqa: E402


def _print_table(rows: list[dict]) -> None:
    if not rows:
        return
    headers = list(rows[0])
    widths = [max(len(str(h)), max(len(str(r.get(h, ""))) for r in rows)) for h in headers]
    print("  ".join(str(h).ljust(w) for h, w in zip(headers, widths, strict=True)))
    print("  ".join("-" * w for w in widths))
    for row in rows:
        print("  ".join(str(row.get(h, "")).ljust(w) for h, w in zip(headers, widths, strict=True)))


def main() -> None:
    argparse.ArgumentParser(description=__doc__).parse_args()

    trials = run(default_scenes())
    print("== مرجع مقیاس A4 ==\n")
    _print_table([Report(trials).as_row("همه")])

    print("\n== به تفکیک چرخش برگه ==")
    _print_table(
        [
            Report([t for t in trials if t.scene.sheet_rotation_deg == angle]).as_row(f"{angle:g}°")
            for angle in sorted({t.scene.sheet_rotation_deg for t in trials})
        ]
    )

    # The one that turned out to explain the rest. Corner refinement works to
    # about half a pixel, and the measurement divides by the sheet's side, so
    # accuracy is set by how large the sheet is in the frame — which is the one
    # thing the shopper controls, by standing closer.
    print("\n== به تفکیک اندازه‌ی برگه در کادر ==")
    buckets = [(0, 55), (55, 75), (75, 100), (100, 10_000)]
    _print_table(
        [
            Report([t for t in trials if low <= t.sheet_px < high]).as_row(
                f"{low}–{high if high < 10_000 else '∞'} px"
            )
            for low, high in buckets
        ]
    )

    print("\n== به تفکیک فاصله‌ی برگه از دوربین ==")
    _print_table(
        [
            Report([t for t in trials if t.scene.distance_m == d]).as_row(f"{d:g} m")
            for d in sorted({t.scene.distance_m for t in trials})
        ]
    )

    print("\n== به تفکیک خطای فرضیِ مدل عمق ==")
    _print_table(
        [
            Report([t for t in trials if t.scene.true_scale == scale]).as_row(f"×{scale:g}")
            for scale in sorted({t.scene.true_scale for t in trials})
        ]
    )

    missed = [t for t in trials if not t.found]
    if missed:
        print(f"\n{len(missed)} صحنه برگه‌ای پیدا نکرد (None برمی‌گرداند، نه حدس).")


if __name__ == "__main__":
    main()
