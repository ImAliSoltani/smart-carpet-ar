"""Measure the AR pipeline: how often it works, and whether it lies about size.

    uv run python scripts/eval_ar.py
    uv run python scripts/eval_ar.py --json ../data/eval/ar.json

Two questions, answered on two different query sets, because they fail in two
different ways:

- **Scale**, over every carpet's own `flat` photograph and every size it is sold
  in. This is the claim in ROADMAP §3-1 and it must be exact; anything above a
  fraction of a percent here is a bug, because the size is arithmetic, not
  estimation.
- **Success rate**, over the styled shots as well. `flat` is the input the
  pipeline was designed for; `cover` and `gallery` are photographs of the same
  rugs that it has never been pointed at, which is §3-4's «ورودی دیده‌نشده».
  The corner detector is expected to lose confidence there, and a run it
  *declines* is behaving correctly — the admin panel's corner editor exists for
  exactly that case (§6-16). The number to read is how often it declines, not
  whether it ever does.

No torch, no database: this reads the catalogue profiles and the generated
images off disk, so it runs anywhere the repository does.
"""

import argparse
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parent))

# Persian output on a Windows console. `uv run` inherits the console's code page,
# which on this machine is cp1256, and cp1256 has no ی — so every table below
# would die on a `UnicodeEncodeError` in the middle of printing. Set here rather
# than asked of whoever runs it.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from catalog_profiles import PROFILES  # noqa: E402

from app.eval.ar_assets import Summary, run_pipeline_on  # noqa: E402

SHOTS = ("flat", "cover", "gallery")


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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("../data/catalog-gen"))
    parser.add_argument("--json", type=Path)
    parser.add_argument(
        "--sizes",
        action="store_true",
        help="every sellable size of every carpet, not just the profile's headline size",
    )
    args = parser.parse_args()

    source = args.source.resolve()
    if not source.is_dir():
        sys.exit(f"پوشه‌ی تصاویر پیدا نشد: {source}")

    by_shot: dict[str, list] = {shot: [] for shot in SHOTS}
    with TemporaryDirectory() as tmp:
        out = Path(tmp)
        for profile in PROFILES:
            slug = profile.slug
            # `variants` is (width, length, price, stock); the price ladder is
            # not this measurement's business.
            sizes = [(v[0], v[1]) for v in profile.variants]
            if not args.sizes:
                sizes = sizes[:1]
            for shot in SHOTS:
                found = sorted(source.glob(f"{slug}__{shot}.*"))
                if not found:
                    continue
                for width_cm, length_cm in sizes:
                    by_shot[shot].append(
                        run_pipeline_on(
                            found[0],
                            width_cm=width_cm,
                            length_cm=length_cm,
                            out_dir=out,
                            label=f"{slug}-{width_cm}x{length_cm}",
                            shot=shot,
                        )
                    )

    summaries = {shot: Summary(runs) for shot, runs in by_shot.items() if runs}
    if not summaries:
        sys.exit("هیچ تصویری برای ارزیابی پیدا نشد")

    print("== پایپ‌لاین AR ==\n")
    _print_table([summary.as_row(shot) for shot, summary in summaries.items()])

    everything = Summary([r for runs in by_shot.values() for r in runs])
    print()
    _print_table([everything.as_row("همه")])

    declined = [r for r in by_shot.get("gallery", []) if not r.automatic]
    if declined:
        print(
            f"\n{len(declined)} اجرای gallery با اطمینان پایین — "
            "این‌ها به ویرایشگر گوشه‌ی پنل ادمین سپرده می‌شوند، شکست نیستند."
        )

    failures = [r for runs in by_shot.values() for r in runs if r.error]
    if failures:
        print(f"\n== خطاها ({len(failures)}) ==")
        for run in failures[:10]:
            print(f"  {run.label} · {run.shot}: {run.error}")

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(
            json.dumps(
                {
                    shot: [
                        {
                            "label": r.label,
                            "confidence": r.confidence,
                            "automatic": r.automatic,
                            "succeeded": r.succeeded,
                            "scale_error": r.scale.worst_error if r.scale else None,
                            "error": r.error,
                        }
                        for r in runs
                    ]
                    for shot, runs in by_shot.items()
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nجزئیات: {args.json}")


if __name__ == "__main__":
    main()
