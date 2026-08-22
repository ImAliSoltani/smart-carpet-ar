"""How well visual search finds the carpet you photographed.

**The query set is unseen by construction.** Only the `flat` shot of each carpet
was embedded at ingest (`ingest_catalog.py` says so and only that image carries
a vector), so the other three shots of the same carpet — `cover`, `room`,
`gallery` — are photographs the index has never met. They are also the three
situations a shopper is actually in: a styled corner shot, a rug living in a
room, a rug displayed on its own. Ground truth needs no labelling, because the
filename carries the slug the image was generated for.

**One relevant item per query**, which fixes what the numbers can mean. With a
single correct answer, Precision@k is mechanically Recall@k / k and carries no
extra information, so the headline here is the hit rate — «share of queries
whose right carpet appeared in the first k» — plus MRR, which is the one number
that notices the difference between rank 2 and rank 20. Precision@k is reported
alongside because the roadmap asks for it by that name.

**Rank is measured over the whole catalogue, not the first page.** The API hands
the storefront twelve results; asking it for as many results as there are active
carpets turns "not found" into an actual rank, and the difference between "just
missed" and "nowhere" is most of what tells you whether a change helped.
"""

from __future__ import annotations

import statistics
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path

from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.carpet import Carpet
from app.services import catalog as catalog_service
from app.services import color as color_service
from app.services import query_windows as windows
from app.services.embeddings import EmbeddingBackend

#: The shots that exist for every carpet but were never indexed. `macro` is
#: absent on purpose — only four carpets have one (روادید فاز ۴٫۵ بند ۳), and a
#: metric averaged over four rows is a rumour.
HELD_OUT_SHOTS: tuple[str, ...] = ("cover", "room", "gallery")

#: Cut-offs reported for every configuration. 1 is the only one a shopper feels;
#: 3 is one row on a phone; 10 is roughly "did it find it at all".
CUTOFFS: tuple[int, ...] = (1, 3, 5, 10)

#: A function from uploaded bytes to the bytes worth embedding. The identity is
#: the baseline; `app.eval.crop` supplies the interesting one.
QueryPreparer = Callable[[bytes], bytes]


@dataclass(frozen=True)
class Query:
    """One held-out photograph and the carpet it is known to show."""

    slug: str
    shot: str
    path: Path

    def read(self) -> bytes:
        return self.path.read_bytes()


@dataclass(frozen=True)
class Ranking:
    """Where the right carpet landed for one query.

    `winning_window` is set only by a windowed run asked for attribution: it
    names the window whose score the right carpet kept, which is the evidence
    the grid was trimmed on. It costs a second pass, so it is off by default —
    it answers a tuning question, not a quality one.
    """

    query: Query
    rank: int | None  # 1-based; None when it never appeared
    winning_window: str | None = None

    @property
    def reciprocal_rank(self) -> float:
        return 0.0 if self.rank is None else 1.0 / self.rank


@dataclass(frozen=True)
class Metrics:
    """Aggregates over a set of rankings. `label` names the configuration."""

    label: str
    n: int
    hit_rate: dict[int, float]
    mrr: float
    median_rank_when_found: float | None
    misses: int

    def precision_at(self, k: int) -> float:
        """Precision@k. One relevant item per query makes this hit_rate/k."""
        return self.hit_rate[k] / k

    def as_row(self) -> dict[str, float | str | None]:
        row: dict[str, float | str | None] = {"config": self.label, "n": self.n}
        for k in sorted(self.hit_rate):
            row[f"hit@{k}"] = round(self.hit_rate[k], 4)
        row["MRR"] = round(self.mrr, 4)
        row["median rank"] = self.median_rank_when_found
        row["misses"] = self.misses
        return row


@dataclass
class RunResult:
    """Everything one configuration produced, so a notebook can drill in."""

    label: str
    rankings: list[Ranking] = field(default_factory=list)

    def metrics(self, *, shot: str | None = None) -> Metrics:
        chosen = [r for r in self.rankings if shot is None or r.query.shot == shot]
        return summarise(chosen, label=self.label if shot is None else f"{self.label} · {shot}")


def summarise(rankings: Sequence[Ranking], *, label: str) -> Metrics:
    if not rankings:
        return Metrics(label, 0, dict.fromkeys(CUTOFFS, 0.0), 0.0, None, 0)
    found = [r.rank for r in rankings if r.rank is not None]
    return Metrics(
        label=label,
        n=len(rankings),
        hit_rate={
            k: sum(1 for r in rankings if r.rank is not None and r.rank <= k) / len(rankings)
            for k in CUTOFFS
        },
        mrr=sum(r.reciprocal_rank for r in rankings) / len(rankings),
        median_rank_when_found=statistics.median(found) if found else None,
        misses=len(rankings) - len(found),
    )


async def active_slugs(session: AsyncSession) -> set[str]:
    """Slugs of the carpets the storefront actually shows.

    The 74 carpets of the previous catalogue are still rows — deactivated, not
    deleted (فاز ۴٫۵ بند ۶) — and `search_by_embedding` already refuses to
    return them. Querying with an image of one would score a guaranteed miss
    against a system behaving correctly.
    """
    rows = await session.execute(select(Carpet.slug).where(Carpet.is_active.is_(True)))
    return {slug for (slug,) in rows}


async def catalogue_size(session: AsyncSession) -> int:
    total = await session.scalar(
        select(func.count()).select_from(Carpet).where(Carpet.is_active.is_(True))
    )
    return int(total or 0)


def collect_queries(
    source_dir: Path,
    *,
    slugs: Iterable[str],
    shots: Sequence[str] = HELD_OUT_SHOTS,
) -> list[Query]:
    """Held-out photographs, found by the `{slug}__{shot}.{ext}` contract.

    The extension is not fixed: the generator wrote mostly `.png` and a few
    `.jpg`, and pinning one silently drops those rows from the query set — a
    smaller n that still prints a percentage.
    """
    known = set(slugs)
    queries: list[Query] = []
    for slug in sorted(known):
        for shot in shots:
            matches = sorted(source_dir.glob(f"{slug}__{shot}.*"))
            if matches:
                queries.append(Query(slug=slug, shot=shot, path=matches[0]))
    return queries


async def rank_one(
    session: AsyncSession,
    query_bytes: bytes,
    *,
    embedder: EmbeddingBackend,
    truth_slug: str,
    depth: int,
    use_colour: bool = True,
) -> int | None:
    """Rank of `truth_slug` in the real search, or None if it never appears.

    This is the API's own call — `visual_search` differs only in asking for
    twelve results instead of the whole catalogue, so a change that improves
    this number improves the endpoint by construction.
    """
    vector = embedder.embed_image(query_bytes)
    histogram = None
    if use_colour:
        histogram = color_service.analyse(Image.open(BytesIO(query_bytes))).histogram
    matches = await catalog_service.search_by_embedding(
        session, vector, color_histogram=histogram, limit=depth
    )
    for position, (item, _score) in enumerate(matches, start=1):
        if item.slug == truth_slug:
            return position
    return None


async def evaluate(
    session: AsyncSession,
    queries: Sequence[Query],
    *,
    embedder: EmbeddingBackend,
    label: str,
    depth: int,
    use_colour: bool = True,
    prepare: QueryPreparer | None = None,
) -> RunResult:
    """Run every query through the search and record where the truth landed.

    `prepare` is the hook every experiment in this file turns on: it receives the
    uploaded bytes and returns the bytes that should actually be embedded. The
    baseline passes None (embed the photograph as uploaded); the crop experiment
    passes a function that cuts the carpet out first.
    """
    result = RunResult(label=label)
    for query in queries:
        data = query.read()
        if prepare is not None:
            data = prepare(data)
        rank = await rank_one(
            session,
            data,
            embedder=embedder,
            truth_slug=query.slug,
            depth=depth,
            use_colour=use_colour,
        )
        result.rankings.append(Ranking(query=query, rank=rank))
    return result


async def rank_one_windowed(
    session: AsyncSession,
    image: Image.Image,
    *,
    embedder: EmbeddingBackend,
    truth_slug: str,
    depth: int,
    grid: tuple[windows.Window, ...] = windows.DEFAULT_GRID,
    attribute: bool = False,
) -> tuple[int | None, str | None]:
    """Rank of the right carpet under the window fusion, and which window won.

    The ranking itself comes from `catalog_service.search_by_photograph` — the
    function the endpoint calls, on the same grid — so this measures what ships.
    The per-window attribution beside it cannot come from there, because the
    production path deliberately does not carry it: knowing *which* window
    answered is worth a grid's worth of tuning here and nothing at all to a
    shopper. So it is recomputed alongside, and only for the winning carpet.
    """
    matches = await catalog_service.search_by_photograph(
        session, image, embedder=embedder, limit=depth, grid=grid
    )
    rank = None
    for position, (item, _score) in enumerate(matches, start=1):
        if item.slug == truth_slug:
            rank = position
            break
    if rank is None or not attribute:
        return rank, None

    # Which window found it: the same per-window search, kept to the one carpet
    # whose provenance is being asked about.
    best_label, best_score = None, -1.0
    for window, view in windows.cut(image, grid):
        vector = embedder.embed_batch([view])[0]
        histogram = color_service.analyse(view).histogram
        for item, score in await catalog_service.search_by_embedding(
            session, vector, color_histogram=histogram, limit=depth
        ):
            if item.slug == truth_slug and score > best_score:
                best_label, best_score = window.label, score
    return rank, best_label


async def evaluate_windowed(
    session: AsyncSession,
    queries: Sequence[Query],
    *,
    embedder: EmbeddingBackend,
    label: str,
    depth: int,
    grid: tuple[windows.Window, ...] = windows.DEFAULT_GRID,
    attribute: bool = False,
) -> RunResult:
    result = RunResult(label=label)
    for query in queries:
        with Image.open(query.path) as image:
            rank, window = await rank_one_windowed(
                session,
                image.convert("RGB"),
                embedder=embedder,
                truth_slug=query.slug,
                depth=depth,
                grid=grid,
                attribute=attribute,
            )
        result.rankings.append(Ranking(query=query, rank=rank, winning_window=window))
    return result


def window_wins(result: RunResult) -> dict[str, int]:
    """How often each window carried the right answer. Empty for plain runs."""
    counts: dict[str, int] = {}
    for ranking in result.rankings:
        if ranking.winning_window is not None:
            counts[ranking.winning_window] = counts.get(ranking.winning_window, 0) + 1
    return dict(sorted(counts.items(), key=lambda kv: -kv[1]))
