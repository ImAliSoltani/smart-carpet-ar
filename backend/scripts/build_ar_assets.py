"""Build the `.glb`/`.usdz` pair for every variant that is missing one.

    uv run python scripts/build_ar_assets.py --missing-only
    uv run python scripts/build_ar_assets.py --only qom-silk-lachak-sormei
    uv run python scripts/build_ar_assets.py --rebuild

Until now AR assets were made one carpet at a time, from the admin panel, by a
shopkeeper who had just uploaded a photo. That is the right shape for one
carpet and the wrong shape for forty: a catalogue arriving in bulk needs the
same work done without a browser, and needs to say afterwards which variants
came out and which did not.

It runs the production pipeline — `app.ar.pipeline.generate_for_carpet`, the
exact call the admin panel makes — rather than a second implementation beside
it. Bulk data has to exercise the real path, or it stops being evidence that
the real path works.

Every carpet is committed as it finishes, so an interrupted run keeps what it
already built and `--missing-only` picks up where it stopped.
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.ar import pipeline as ar_pipeline
from app.db.session import SessionLocal
from app.models import Carpet, CarpetVariant
from app.models.enums import ArAssetStatus
from app.services.storage import Storage

ROOT = Path(__file__).resolve().parents[2]


async def run(only: list[str], missing_only: bool, rebuild: bool, limit: int | None) -> int:
    storage = Storage()

    async with SessionLocal() as session:
        query = select(Carpet).options(selectinload(Carpet.variants)).order_by(Carpet.id)
        if only:
            query = query.where(Carpet.slug.in_(only))
        carpets = (await session.execute(query)).scalars().all()

        if missing_only and not rebuild:
            carpets = [
                c for c in carpets if any(v.glb_url is None for v in c.variants)
            ]
        if limit:
            carpets = carpets[:limit]

        if not carpets:
            print("nothing to build")
            return 0

        total_variants = sum(len(c.variants) for c in carpets)
        print(f"{len(carpets)} carpets, {total_variants} variants\n")

        built = failed = 0
        started = time.monotonic()
        for index, carpet in enumerate(carpets, start=1):
            label = f"[{index}/{len(carpets)}] {carpet.slug}"
            try:
                assets = await ar_pipeline.generate_for_carpet(
                    session, carpet.id, storage=storage
                )
            except ar_pipeline.ArPipelineError as exc:
                print(f"FAIL {label}: {exc}")
                failed += 1
                continue
            built += len(assets)
            elapsed = time.monotonic() - started
            rate = elapsed / index
            left = rate * (len(carpets) - index)
            print(
                f"OK   {label}: {len(assets)} variants "
                f"({elapsed / 60:.1f}m elapsed, ~{left / 60:.1f}m left)"
            )

        # Read the truth back off the rows rather than trusting the counters —
        # the pipeline marks a variant failed without raising when only one size
        # of several goes wrong.
        done = await session.scalar(
            select(func.count(CarpetVariant.id)).where(CarpetVariant.glb_url.isnot(None))
        )
        broken = await session.scalar(
            select(func.count(CarpetVariant.id)).where(
                CarpetVariant.ar_status == ArAssetStatus.FAILED
            )
        )
        print(f"\nbuilt {built} variant assets, {failed} carpets failed outright")
        print(f"catalogue now: {done} variants with a glb, {broken} marked failed")
        return 1 if failed or broken else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", nargs="*", default=[], help="slugs to build")
    parser.add_argument(
        "--missing-only", action="store_true", help="skip carpets whose variants all have a glb"
    )
    parser.add_argument(
        "--rebuild", action="store_true", help="rebuild even variants that already have assets"
    )
    parser.add_argument("--limit", type=int, help="stop after this many carpets")
    args = parser.parse_args()
    return asyncio.run(run(args.only, args.missing_only, args.rebuild, args.limit))


if __name__ == "__main__":
    sys.exit(main())
