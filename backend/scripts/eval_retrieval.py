"""Measure visual search against held-out photographs of the same carpets.

    uv run --group ml python scripts/eval_retrieval.py
    uv run --group ml python scripts/eval_retrieval.py --json out/retrieval.json

`--group ml` is not optional here and the script refuses to run without it. The
hash fallback answers every query with a vector orthogonal to the stored ones,
so the run would finish, print percentages, and describe nothing — the exact
failure that cost a day in فاز ۴. A benchmark that cannot tell it is measuring
noise is worse than no benchmark.

Configurations are compared on one query set so the differences mean something:
single-stage (structure alone) against the two-stage ranking the API ships, and
— once `app.eval.crop` exists — the same two-stage ranking over a query image
cropped to the carpet.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from app.db.session import SessionLocal
from app.eval import retrieval
from app.eval.crop import crop_to_carpet
from app.services import query_windows as windows
from app.services.embeddings import DinoV2Backend, get_embedding_backend

DEFAULT_SOURCE = Path("../data/catalog-gen")

# Persian output on a Windows console. `uv run` inherits the console's code page,
# which on this machine is cp1256, and cp1256 has no ی — so every table below
# would die on a `UnicodeEncodeError` in the middle of printing. Set here rather
# than asked of whoever runs it.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def _require_real_embeddings() -> DinoV2Backend:
    backend = get_embedding_backend()
    if not isinstance(backend, DinoV2Backend):
        sys.exit(
            "امبدینگ واقعی در دسترس نیست (torch نصب نیست).\n"
            "این اسکریپت با بک‌اند قلابی عدد بی‌معنا تولید می‌کند، پس اجرا نمی‌شود.\n"
            "  uv sync --group ml   سپس   uv run --group ml python scripts/eval_retrieval.py"
        )
    return backend


def _print_table(rows: list[dict]) -> None:
    if not rows:
        return
    headers = list(rows[0])
    widths = [
        max(len(str(h)), max(len(str(r.get(h, ""))) for r in rows)) for h in headers
    ]
    line = "  ".join(str(h).ljust(w) for h, w in zip(headers, widths, strict=True))
    print(line)
    print("  ".join("-" * w for w in widths))
    for row in rows:
        print("  ".join(str(row.get(h, "")).ljust(w) for h, w in zip(headers, widths, strict=True)))


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--json", type=Path, help="also write the raw ranks here")
    parser.add_argument(
        "--quick",
        action="store_true",
        help="only the whole-frame baseline and the shipped grid (~4× faster)",
    )
    parser.add_argument(
        "--attribute",
        action="store_true",
        help="also report which window carried each answer (doubles the windowed run)",
    )
    args = parser.parse_args()

    source = args.source.resolve()
    if not source.is_dir():
        sys.exit(f"پوشه‌ی تصاویر پیدا نشد: {source}")

    embedder = _require_real_embeddings()

    async with SessionLocal() as session:
        slugs = await retrieval.active_slugs(session)
        depth = await retrieval.catalogue_size(session)
        queries = retrieval.collect_queries(source, slugs=slugs)
        if not queries:
            sys.exit(f"هیچ تصویر آزمونی در {source} پیدا نشد")

        print(f"کاتالوگ فعال: {depth} فرش · پرسش‌ها: {len(queries)} تصویر دیده‌نشده\n")

        runs = []
        if not args.quick:
            # The two the whole-frame baseline is made of, and the detector that
            # was tried and discarded. Kept runnable rather than deleted: the
            # thesis argues the window fusion earns its cost, and the argument
            # is only worth anything if the alternatives can be re-measured.
            runs.append(
                await retrieval.evaluate(
                    session, queries, embedder=embedder,
                    label="single-stage (structure only)", depth=depth, use_colour=False,
                )
            )
        runs.append(
            await retrieval.evaluate(
                session, queries, embedder=embedder,
                label="two-stage, whole frame (was shipped)", depth=depth,
            )
        )
        if not args.quick:
            runs.append(
                await retrieval.evaluate(
                    session, queries, embedder=embedder,
                    label="two-stage + rug crop (rejected)", depth=depth,
                    prepare=crop_to_carpet,
                )
            )
            runs.append(
                await retrieval.evaluate_windowed(
                    session, queries, embedder=embedder,
                    label=f"windowed ×{len(windows.FULL_GRID)} (full grid)",
                    depth=depth, grid=windows.FULL_GRID, attribute=args.attribute,
                )
            )
        runs.append(
            await retrieval.evaluate_windowed(
                session, queries, embedder=embedder,
                label=f"windowed ×{len(windows.DEFAULT_GRID)} (trimmed, shipped)",
                depth=depth, grid=windows.DEFAULT_GRID, attribute=args.attribute,
            )
        )

    print("== همه‌ی پرسش‌ها ==")
    _print_table([run.metrics().as_row() for run in runs])

    for shot in retrieval.HELD_OUT_SHOTS:
        print(f"\n== shot = {shot} ==")
        _print_table([run.metrics(shot=shot).as_row() for run in runs])

    for run in runs:
        wins = retrieval.window_wins(run)
        if wins:
            print(f"\n== کدام پنجره جواب را برد ({run.label}) ==")
            for window, count in wins.items():
                print(f"  {count:3d}  {window}")

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(
            json.dumps(
                {
                    run.label: [
                        {"slug": r.query.slug, "shot": r.query.shot, "rank": r.rank}
                        for r in run.rankings
                    ]
                    for run in runs
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nرتبه‌های خام: {args.json}")


if __name__ == "__main__":
    asyncio.run(main())
