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
"""

from __future__ import annotations

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
                "same colours, the same weave — create a premium e-commerce cover "
                "photograph of it. Show the rug at a slight three-quarter angle on "
                "a pale warm concrete floor, one corner turned up just enough to "
                "show the pile depth, soft directional daylight from one side and "
                "a long gentle shadow. Warm neutral background, generous empty "
                "space around the rug. Editorial catalogue photography, shallow "
                "depth of field at the far edge. Do not change the rug's design."
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
                "Place the attached rug — unchanged — alone in a quiet museum "
                "gallery: a large warm off-white room, polished pale floor, one "
                "wall visible, a single soft overhead light pooling on the rug, "
                "deep empty space around it. Nothing else in the frame. Calm, "
                "reverent, architectural photography with the rug as the only "
                "object. Shot straight on from a low standing height."
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
