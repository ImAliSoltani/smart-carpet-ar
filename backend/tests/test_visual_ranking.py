"""The second stage of visual search, on data built to isolate it.

The ranking mixes two signals, so a test that lets both vary proves nothing:
whichever way it comes out, either signal could have decided it. These write
the embeddings and the histograms directly instead of going through the upload
pipeline, so structure can be held equal while colour is the only thing that
differs — and then the other way round.

That also keeps the assertions independent of which embedding backend is
installed. The suite runs `HashEmbeddingBackend`, whose vectors are stable but
meaningless, and a test of *ranking* must not quietly become a test of DINOv2.
"""

import pytest
from sqlalchemy import select

from app.models import Carpet, CarpetImage, CarpetVariant
from app.models.carpet import COLOR_HISTOGRAM_DIM, EMBEDDING_DIM
from app.models.enums import CarpetMaterial, CarpetPattern
from app.services import catalog as catalog_service


def _embedding(tilt: float) -> list[float]:
    """A unit vector; `tilt` moves it away from the query along one axis."""
    vector = [0.0] * EMBEDDING_DIM
    vector[0] = 1.0 - tilt
    vector[1] = tilt
    norm = sum(v * v for v in vector) ** 0.5
    return [v / norm for v in vector]


def _histogram(bin_index: int) -> list[float]:
    """All of the carpet's pixels in one colour bin."""
    histogram = [0.0] * COLOR_HISTOGRAM_DIM
    histogram[bin_index] = 1.0
    return histogram


async def _add(session, slug: str, *, tilt: float, bin_index: int | None) -> None:
    carpet = Carpet(
        slug=slug,
        name=f"فرش {slug}",
        pattern=CarpetPattern.MEDALLION,
        material=CarpetMaterial.WOOL,
        colors=[],
        color_families=[],
        suitable_rooms=[],
        is_active=True,
    )
    session.add(carpet)
    await session.flush()
    session.add(
        CarpetVariant(carpet_id=carpet.id, width_cm=150, length_cm=225, price=1, stock=1)
    )
    session.add(
        CarpetImage(
            carpet_id=carpet.id,
            url=f"/files/card/{slug}.webp",
            position=0,
            is_primary=True,
            embedding=_embedding(tilt),
            color_histogram=_histogram(bin_index) if bin_index is not None else None,
        )
    )


async def _ranked(session, *, colour_bin: int | None) -> list[str]:
    matches = await catalog_service.search_by_embedding(
        session,
        _embedding(0.0),
        color_histogram=_histogram(colour_bin) if colour_bin is not None else None,
        limit=10,
    )
    return [item.slug for item, _ in matches]


@pytest.mark.asyncio
async def test_colour_breaks_the_tie_between_lookalikes(db) -> None:
    """The failure this stage was added for.

    DINOv2 reads a carpet's structure and is close to colour-blind, so two rugs
    woven to the same design score almost identically however differently they
    are dyed — and the shopper who photographed the green one gets the red one
    first. Here structure is *exactly* equal, so colour is the only thing left
    to decide, and it must.
    """
    from app.db.session import SessionLocal

    async with SessionLocal() as session:
        await _add(session, "same-shape-green", tilt=0.20, bin_index=18)
        await _add(session, "same-shape-red", tilt=0.20, bin_index=0)
        await session.commit()

        assert await _ranked(session, colour_bin=18) == [
            "same-shape-green",
            "same-shape-red",
        ]
        # And the query decides it, not a fixed preference for one bin.
        assert await _ranked(session, colour_bin=0) == [
            "same-shape-red",
            "same-shape-green",
        ]


@pytest.mark.asyncio
async def test_structure_still_leads(db) -> None:
    """Colour reorders lookalikes; it does not overrule the shape of the rug.

    A carpet that merely shares a palette must not displace one that shares the
    design — that would trade the failure for its mirror image.
    """
    from app.db.session import SessionLocal

    async with SessionLocal() as session:
        await _add(session, "right-shape-wrong-colour", tilt=0.02, bin_index=0)
        await _add(session, "wrong-shape-right-colour", tilt=0.60, bin_index=18)
        await session.commit()

        assert (await _ranked(session, colour_bin=18))[0] == "right-shape-wrong-colour"


@pytest.mark.asyncio
async def test_a_missing_histogram_is_not_a_colour_mismatch(db) -> None:
    """Rows predating the backfill must not be buried.

    Scoring a null histogram as "no colours in common" is the tempting shortcut
    and it silently drops every un-backfilled carpet to the bottom of every
    search. Missing means «cannot judge», so such a row keeps its structure
    score and stays where structure put it.
    """
    from app.db.session import SessionLocal

    async with SessionLocal() as session:
        await _add(session, "closest-but-uncoloured", tilt=0.05, bin_index=None)
        await _add(session, "further-and-matching", tilt=0.50, bin_index=18)
        await session.commit()

        assert (await _ranked(session, colour_bin=18))[0] == "closest-but-uncoloured"


@pytest.mark.asyncio
async def test_reranking_reaches_past_the_answer(db) -> None:
    """Stage one over-fetches, or stage two has nothing to work with.

    With a candidate pool the size of `limit`, a carpet ranked below the cut on
    structure can never be promoted however well its colour matches — the second
    stage degenerates into reordering a list already chosen without it.
    """
    from app.db.session import SessionLocal

    async with SessionLocal() as session:
        for index in range(8):
            await _add(session, f"filler-{index}", tilt=0.10 + index * 0.01, bin_index=0)
        await _add(session, "far-but-exact-colour", tilt=0.30, bin_index=18)
        await session.commit()

        top_three = await catalog_service.search_by_embedding(
            session, _embedding(0.0), color_histogram=_histogram(18), limit=3
        )
        assert "far-but-exact-colour" in [item.slug for item, _ in top_three]


@pytest.mark.asyncio
async def test_inactive_carpets_stay_out(db) -> None:
    """Re-ranking must not become a way back into the catalogue."""
    from app.db.session import SessionLocal

    async with SessionLocal() as session:
        await _add(session, "withdrawn", tilt=0.01, bin_index=18)
        carpet = (
            await session.execute(select(Carpet).where(Carpet.slug == "withdrawn"))
        ).scalar_one()
        carpet.is_active = False
        await session.commit()

        assert await _ranked(session, colour_bin=18) == []
