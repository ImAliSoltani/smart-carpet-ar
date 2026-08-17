"""Five prompts per carpet, built from the profile rather than typed beside it.

Generated for the same reason the conversational search prompt is generated: a
prompt file written by hand is a second copy of the catalogue, and it drifts the
first time a profile changes — silently, because the images still arrive, just
of the wrong carpet.

**The order is the design.** Prompt 1 makes the carpet; prompts 2–5 photograph
*that* carpet. They are written to be sent with the first image attached, as an
edit rather than a fresh generation, because an image model asked twice for «a
red Kashan rug» produces two different rugs — and a shop whose cover photo and
AR model are different carpets is lying to the customer in the one place the
whole product is supposed to be honest.

That is also why prompt 1 is the strictest. It is not a nice photograph: it is
a texture, and four things about it are load-bearing.

- **Flat and square-on.** The AR pipeline rectifies perspective and bakes the
  result into the `.glb`; a three-quarter view gives it a trapezoid to unwarp
  and the weave stretches at one end.
- **No background at all — the rug fills the frame.** `extract_dominant_colors`
  and the HSV histogram skip *transparent* pixels, and a generated JPEG has no
  transparency, so anything that is not carpet is counted as carpet. This was
  first written asking for a white backdrop, which is how a navy Qom came back
  filed under «سفید»: a third of its pixels were the studio, not the rug. Edge to
  edge also gives the AR rectifier its four corners for free.
- **Nothing on it.** A coffee table baked into the texture never comes off.
- **Even light.** A hotspot becomes a permanent bright patch on the 3D model,
  which reads as a stain from every angle in the room.

Prompts 2–5 are free to be beautiful, because nothing measures them. They feed
the gallery, and one of them doubles as a test photograph for the room adviser.

They were not beautiful at first. The cover and the gallery both put the rug
alone on a bare floor, and both came back reading as a cut-out pasted onto a
backdrop — the failure is emptiness, not lighting. What fixes it is a floor with
grain and seams instead of a flat plane, a wall with light raking across it, and
two or three small specific objects: a bench, a stoneware vase of dried
branches, a brass strip at the skirting. Those are staged in `_ROOM_SHELL` and
rotated per carpet, so forty rugs are not photographed in one room forty times.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from catalog_profiles import CarpetProfile

from app.models.enums import CarpetMaterial

#: Filenames the ingest script reads back. The slug carries the mapping, so the
#: only thing the generator has to get right is not renaming the files.
SHOTS: tuple[str, ...] = ("flat", "cover", "macro", "room", "gallery")

#: How each material should be described to an image model. The Persian words
#: mean nothing to it, and "acrylic" alone produces plastic.
_MATERIAL_LOOK: dict[CarpetMaterial, str] = {
    CarpetMaterial.SILK: (
        "hand-knotted natural silk, fine lustrous pile that shifts tone with the light"
    ),
    CarpetMaterial.WOOL: "hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn",
    CarpetMaterial.COTTON: "flat cotton weave, matte and low, visible warp and weft",
    CarpetMaterial.MIXED: (
        "wool pile with silk-highlighted motifs, the silk catching light against matte wool"
    ),
    CarpetMaterial.ACRYLIC: (
        "machine-woven heat-set acrylic, even velvety pile, very regular and crisp"
    ),
    CarpetMaterial.POLYESTER: "machine-woven polyester, soft even pile, slight sheen",
    CarpetMaterial.VISCOSE: "machine-woven viscose, silky sheen, smooth short pile",
}


#: The setting shots 2 and 5 are staged in, written once because both of them
#: were failing the same way: a rug alone on an empty floor reads as a cut-out
#: pasted onto a backdrop, and no amount of good lighting rescues it. What sells
#: «this is a real room» is a handful of small specific objects with the light
#: falling across them — and the floor itself having grain, seams and character
#: rather than being the flat grey plane the first version asked for.
_ROOM_SHELL = (
    "a wide-plank pale oak floor with visible grain and plank seams, a warm "
    "lime-washed plaster wall behind, a slim brass strip where the wall meets "
    "the floor, and soft raking daylight from a tall window just out of frame "
    "throwing a long angled shadow across the wall"
)

#: Small props, rotated so forty carpets are not photographed in one room forty
#: times. Chosen by slug, so the same carpet always gets the same corner and a
#: regenerated image matches the one beside it.
_COVER_PROPS: tuple[str, ...] = (
    "a low dark-wood bench against the wall with a rustic stoneware vase of "
    "dried branches standing beside it",
    "a slim walnut stool holding a folded wool throw, and a small brass tray on "
    "the floor next to it",
    "a potted olive tree in an unglazed terracotta pot, and a pair of leather "
    "slippers left at the edge of the rug",
    "a tall paper floor lamp casting a warm pool of light, and two hardback "
    "books stacked on the floor",
    "a low ceramic bowl of pomegranates on the floor and a linen curtain half "
    "drawn at the window edge",
    "a simple wooden ladder leaning against the wall with a folded blanket over "
    "one rung",
)

#: The gallery is deliberately a different world from the cover: architecture
#: rather than furniture, and Persian rather than generic — an arch, stone, a
#: high ceiling. It answers the site's «گالری موزه‌ای» direction, which is what
#: it is there for.
_GALLERY_PROPS: tuple[str, ...] = (
    "a tall plain brick arch in the far wall with daylight falling through it",
    "a low travertine plinth standing empty in the corner",
    "a long dark-wood visitors' bench set against the far wall",
    "a deep empty niche cut into the plaster wall, lit from above",
    "a single tall window with a stone sill and no curtain",
)


def _pick(options: tuple[str, ...], slug: str, salt: str) -> str:
    """One of `options`, stable for a given carpet."""
    digest = hashlib.sha256(f"{salt}:{slug}".encode()).digest()
    return options[digest[0] % len(options)]


@dataclass(frozen=True)
class Shot:
    """One image to be generated: its filename stem and what to ask for."""

    name: str
    prompt: str
    #: True when the model must be given the flat image as a reference. Only the
    #: first shot is generated from text alone.
    needs_reference: bool


def _subject(profile: CarpetProfile) -> str:
    """The one sentence that says which carpet this is, reused by every shot."""
    weave = "a hand-knotted Persian" if profile.handmade else "an Iranian machine-woven"
    return (
        f"{weave} carpet from {_ORIGIN_EN.get(profile.origin, profile.origin)}, "
        f"{profile.motif}, {_MATERIAL_LOOK[profile.material]}"
    )


#: Persian place names mean less to an image model than their English forms, and
#: some — «آران و بیدگل» — mean nothing at all. The weaving city is a strong
#: style signal when the model recognises it, so it is worth spelling out.
_ORIGIN_EN: dict[str, str] = {
    "قم": "Qom",
    "اصفهان": "Isfahan",
    "نایین": "Nain",
    "تبریز": "Tabriz",
    "کاشان": "Kashan",
    "مشهد": "Mashhad",
    "کرمان": "Kerman",
    "اراک": "Arak (Sultanabad)",
    "بیرجند": "Birjand",
    "شیراز — قشقایی": "Shiraz",
    "سیستان — بلوچ": "Sistan",
    "همدان": "Hamedan",
    "اردبیل": "Ardabil",
    "یزد": "Yazd",
    "آران و بیدگل": "Aran-o-Bidgol",
}


def build_shots(profile: CarpetProfile) -> list[Shot]:
    """The five prompts for one carpet, in the order they must be generated."""
    subject = _subject(profile)
    note = f" {profile.prompt_note}." if profile.prompt_note else ""
    # The rug's real proportion, so the generated image is not a square rug that
    # the AR pipeline then has to stretch into a 200×300.
    width, length = _representative_size(profile)
    ratio = f"{width}:{length} aspect ratio (a {width}×{length} cm rug)"

    return [
        Shot(
            name="flat",
            needs_reference=False,
            prompt=(
                f"A top-down flat texture photograph of {subject}.{note} "
                f"The rug completely fills the frame in {ratio}, edge to edge, "
                "with NO background visible on any side — the four edges of the "
                "rug are the four edges of the image. Photographed perfectly "
                "square-on from directly above, edges parallel to the frame, no "
                "perspective distortion whatsoever. "
                "Completely flat, no folds, no curled corners, nothing on it and "
                "nothing casting a shadow onto it. Even diffuse lighting across "
                "the whole surface with no hotspots and no gradient. Sharp focus "
                "edge to edge so the weave is legible. A texture reference, not a "
                "styled product shot."
            ),
        ),
        Shot(
            name="cover",
            needs_reference=True,
            prompt=(
                "Using the attached rug exactly as it is — the same pattern, the "
                "same colours, the same weave — photograph it lying in a quiet, "
                "beautiful corner of a real home. "
                f"The setting: {_ROOM_SHELL}. In the corner there is "
                f"{_pick(_COVER_PROPS, profile.slug, 'cover')}. "
                "The rug lies flat on the floor at a three-quarter angle, its "
                "fringe toward the camera, seen from standing height looking down "
                "at roughly fifty degrees, filling most of the lower two thirds of "
                "a vertical frame. Warm natural light, soft long shadows, calm and "
                "unstyled — a home somebody actually lives in, not a showroom. "
                "Editorial interior photography. Do not change the rug's design, "
                "its colours, or its proportions."
            ),
        ),
        Shot(
            name="macro",
            needs_reference=True,
            prompt=(
                "Using the attached rug, create an extreme close-up macro "
                "photograph of its surface, filling the frame with about 15 "
                "centimetres of the pile — individual knots, fibres and the edge "
                "of one motif clearly visible. Raking side light so the texture "
                "reads as depth. The same colours and the same motif as the "
                "attached image. Sharp macro detail, shallow depth of field."
            ),
        ),
        Shot(
            name="room",
            needs_reference=True,
            prompt=(
                "Place the attached rug — unchanged in pattern and colour — on the "
                f"floor of a real, lived-in {_ROOM_EN[profile.rooms[0].value]}. "
                "Natural window light, real furniture partly standing on the rug, "
                "a Persian-Iranian apartment interior. Photographed from standing "
                "eye level, wide enough to see the walls and the furniture as well "
                "as the floor. Believable everyday photograph, not a render."
            ),
        ),
        Shot(
            name="gallery",
            needs_reference=True,
            prompt=(
                "Place the attached rug — unchanged in pattern, colour and "
                "proportion — alone on the floor of a quiet Persian museum "
                "gallery. A tall room with warm lime-washed walls and a polished "
                "stone floor, high ceiling, and "
                f"{_pick(_GALLERY_PROPS, profile.slug, 'gallery')}. "
                "One shaft of daylight falls across the rug and up the far wall, "
                "leaving the corners of the room in soft shadow. The rug is the "
                "only object on the floor, laid at a slight angle, seen from "
                "standing height with enough of the architecture around it to feel "
                "the height of the room. Reverent, architectural photography, warm "
                "and still. Vertical frame."
            ),
        ),
    ]


_ROOM_EN: dict[str, str] = {
    "living_room": "living room",
    "bedroom": "bedroom",
    "dining_room": "dining room",
    "office": "home office",
    "kids_room": "child's bedroom",
    "hallway": "hallway",
}


def _representative_size(profile: CarpetProfile) -> tuple[int, int]:
    """The size the flat photograph should be shaped like.

    The middle of the ladder rather than the largest, because the proportion is
    what matters and the middle sizes are the ones a shopper pictures. Runners
    are the exception the rule exists for: a کناره photographed at 2:3 would be
    a different product.
    """
    sizes = [(w, length) for w, length, _, _ in profile.variants]
    return sizes[len(sizes) // 2]
