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

They were not beautiful at first, and the fix took two passes. The failure was
never the lighting: the cover and the gallery both put the rug alone on a bare
plane, and a rug alone on a bare plane reads as a cut-out pasted onto a
backdrop. What repairs it is specificity — a **parquet** floor with a laying
pattern and grain rather than a grey plane, a corner where two walls meet, the
shadow of the window bars falling across the plaster, and objects that are
simply not the exhibit: a bench, a vessel in an alcove, a framed miniature.

The second pass added the things a photograph has that a description does not.
The rug runs out of the bottom of the frame, so the camera feels close rather
than surveying; the grade is named (medium-format film, warm, muted, gentle
contrast) rather than left to «editorial»; and the gallery stopped being a white
box with one object in it, which is not reverence, only emptiness.

Floors and props rotate per carpet, picked from the slug, so forty rugs are not
photographed in one room forty times.
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


#: The floor under every staged shot, and it is always parquet. After the rug
#: it is the largest surface in the frame, so a flat plane there flattens
#: everything above it — grain, seams and a laying pattern are most of what
#: makes a room read as a room rather than as a backdrop. Rotated, because five
#: different parquets across forty carpets is a shop and one parquet is a set.
_FLOORS: tuple[str, ...] = (
    "a wide-plank whitewashed oak parquet floor, heavy visible grain, open "
    "knots and clear seams between the boards",
    "a herringbone parquet floor in pale honey oak, the chevrons catching the "
    "light at different angles",
    "a warm mid-brown walnut parquet in long planks, satin finish, the grain "
    "running away from the camera",
    "a chevron parquet floor in weathered ash, grey-beige, with fine dark "
    "joints between the pieces",
    "a classic Iranian wood-look parquet in warm caramel tones, narrow boards, "
    "slightly worn where the light falls",
)

_ROOM_SHELL = (
    "a warm lime-washed plaster wall with visible hand-troweled texture, the "
    "corner of the room showing where two walls meet, a slim brass strip along "
    "the skirting, and low golden daylight from a tall window just out of frame "
    "on the left throwing the soft-edged shadow of the window bars across the "
    "wall and the floor"
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

#: The gallery is a different world from the cover: architecture rather than
#: furniture, and Persian rather than generic. The first version was a bare
#: white box with one object in it, which is not «reverent», only empty — a real
#: gallery is full of things that are simply not the exhibit. So each of these
#: furnishes the room properly: an alcove with a vessel standing in it, a framed
#: miniature on the wall, light through coloured glass.
_GALLERY_PROPS: tuple[str, ...] = (
    "a tall brick arch in the far wall, a deep plaster alcove beside it holding "
    "a single large turquoise-glazed ceramic vessel, and two small framed "
    "Persian miniatures hung on the wall",
    "an orosi window — the traditional Persian lattice of coloured stained "
    "glass — throwing red, blue and amber "
    "patches of light across the floor, a low travertine plinth below it with a "
    "bronze ewer standing on it",
    "a long dark-wood visitors' bench with a folded kilim cushion on it, a tall "
    "brass floor lamp beside it, and a large framed calligraphy panel on the wall",
    "carved wooden ceiling beams overhead, a deep niche in the plaster holding "
    "three antique ceramic bowls, and a potted fig tree in a glazed pot",
    "a colonnade of plain brick columns running down one side, a stone bench "
    "between two of them, and a big framed textile fragment lit on the far wall",
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
                "same colours, the same weave — photograph it lying in the quiet "
                "corner of a beautiful, expensive, minimal home. "
                f"The floor is {_pick(_FLOORS, profile.slug, 'floor')}. "
                f"Behind it: {_ROOM_SHELL}. In the corner stands "
                f"{_pick(_COVER_PROPS, profile.slug, 'cover')}. "
                "The rug lies flat and slightly turned, its fringed end nearest "
                "the camera and **running out of the bottom edge of the frame**, "
                "so the photograph feels close rather than surveyed. Camera at "
                "standing height, tilted down about forty degrees. Vertical frame. "
                "Shot on medium-format film: warm golden light, gentle contrast, "
                "slightly muted and faded colours, soft natural shadows, shallow "
                "depth of field so the far wall falls a little out of focus. "
                "Serene, unstyled, luxurious. No people. "
                "Do not change the rug's design, its colours, or its proportions."
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
                f"floor of a real, lived-in {_ROOM_EN[profile.rooms[0].value]} in "
                "a Persian-Iranian apartment. "
                f"The floor around the rug is {_pick(_FLOORS, profile.slug, 'room')} "
                "— parquet, never tile, stone or carpet. "
                "Natural window light, real furniture with some of it standing on "
                "the rug, the ordinary things of a home visible around the edges. "
                "Photographed from standing eye level, wide enough to see the "
                "walls and the furniture as well as the floor. Warm and believable "
                "everyday photograph, not a render and not a showroom."
            ),
        ),
        Shot(
            name="gallery",
            needs_reference=True,
            prompt=(
                "Place the attached rug — unchanged in pattern, colour and "
                "proportion — on the floor of a beautiful Persian museum gallery "
                "housed in a restored historic house. A tall room with warm "
                "lime-washed plaster walls, a polished stone floor, and a high "
                "ceiling. In the room: "
                f"{_pick(_GALLERY_PROPS, profile.slug, 'gallery')}. "
                "A shaft of daylight falls across the rug and up the far wall, "
                "leaving the corners in soft shadow. The rug is the only thing on "
                "the floor and it is unmistakably the exhibit, but the room around "
                "it is furnished and lived-in rather than empty. Seen from "
                "standing height at a slight angle, with enough architecture "
                "around it to feel the height of the room. Vertical frame. Warm, "
                "still, reverent — shot on medium-format film, rich but muted "
                "colour, gentle contrast. No people."
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
