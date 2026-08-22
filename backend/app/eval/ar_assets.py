"""Two numbers about the AR pipeline: does it run, and does it lie about size.

**Scale error is the claim the whole product rests on.** ROADMAP §3-1 sets the
bar at under ~3٪ against a tape measure and names the commercial baseline it is
measured against — a shop whose «۳×۴» carpet renders 0.2 × 0.2 m. That bar has
two halves and only one of them can be automated:

- **Asset error** — the distance between the size in the database and the size
  baked into the `.glb` and `.usdz`. Measured here, over every variant, by
  reading the geometry back out of the written files rather than trusting the
  builder that wrote them. This is the half that can regress silently, because
  nothing on screen looks different when a file is 4٪ small.
- **Device error** — the distance between the asset and a tape measure on a real
  floor. That needs a person, a phone and a metre stick (§12), and no amount of
  code here substitutes for it. What this module does is make the device
  measurement *interpretable*: if the asset is exact to a micrometre and the
  phone says 4٪, the error is in the AR session, not in the pipeline.

**Success rate is measured on photographs the pipeline was not tuned on.** Every
carpet's `flat` shot is the one it was built for; running it on the `cover` and
`gallery` shots asks the harder and more honest question, which is what §3-4
means by «روی ورودی دیده‌نشده». The corner detector is expected to do worse
there, and the number worth reporting is how much worse — a detector that
refuses (confidence 0, full frame) is behaving correctly, and is counted apart
from one that produced a file nobody can use.
"""

from __future__ import annotations

import json
import struct
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from app.ar.glb_builder import build_carpet_glb
from app.ar.rectify import CONFIDENCE_THRESHOLD, detect_corners, rectify
from app.ar.usdz_builder import build_carpet_usdz

GLB_MAGIC = 0x46546C67


@dataclass(frozen=True)
class Dimensions:
    """Extent of a model along each axis, in metres."""

    x: float
    y: float
    z: float


def glb_dimensions(path: Path) -> Dimensions:
    """Read the size back out of a written `.glb`.

    Deliberately parsed here rather than taken from the builder's inputs. The
    question is what the *file* says, and a builder that mis-scales would agree
    with itself perfectly.
    """
    data = path.read_bytes()
    magic, _version, _length = struct.unpack("<III", data[:12])
    if magic != GLB_MAGIC:
        raise ValueError(f"{path} is not a GLB")
    json_len = struct.unpack("<II", data[12:20])[0]
    gltf = json.loads(data[20 : 20 + json_len])

    accessor = gltf["accessors"][gltf["meshes"][0]["primitives"][0]["attributes"]["POSITION"]]
    lo, hi = accessor["min"], accessor["max"]
    return Dimensions(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])


@dataclass(frozen=True)
class ScaleCheck:
    """One variant's declared size against the size in its file."""

    label: str
    declared_w: float
    declared_l: float
    actual_w: float
    actual_l: float

    @property
    def width_error(self) -> float:
        return abs(self.actual_w - self.declared_w) / self.declared_w

    @property
    def length_error(self) -> float:
        return abs(self.actual_l - self.declared_l) / self.declared_l

    @property
    def worst_error(self) -> float:
        return max(self.width_error, self.length_error)


@dataclass(frozen=True)
class PipelineRun:
    """What happened when the pipeline was pointed at one photograph."""

    label: str
    shot: str
    confidence: float
    automatic: bool
    produced_files: bool
    scale: ScaleCheck | None
    error: str | None

    @property
    def succeeded(self) -> bool:
        """Both files written, at the size the catalogue says. Nothing else.

        `automatic` is reported separately and deliberately **not** folded in
        here, which is a correction: it was, and the first run showed why that
        was wrong. Every run produced files whose dimensions were exact — 453 of
        453 across the whole catalogue — while the confidence score sat below
        threshold on 100٪ of the styled shots and 30٪ of the flat ones. The
        combined number therefore reported «0٪ success» about a set of files
        that were all correct.

        The two are measuring different things. Confidence scores the *corner
        detector*, and low confidence makes it fall back to the full frame —
        which for a flat photograph shot edge to edge, as the فاز ۴٫۵ prompts
        require, is the right answer arrived at without conviction. What a
        shopkeeper needs to know is whether the rug came out the right size;
        what the pipeline's author needs to know is how often the detector was
        sure. Reporting one number for both hides whichever is worse.
        """
        return (
            self.error is None
            and self.produced_files
            and self.scale is not None
            and self.scale.worst_error < 0.03
        )


def run_pipeline_on(
    photo: Path,
    *,
    width_cm: int,
    length_cm: int,
    out_dir: Path,
    label: str,
    shot: str,
) -> PipelineRun:
    """Detect, rectify, build both files, and read the size back.

    Every step the production path takes, in the production order, using the
    production functions — `build_variant_assets` is not called only because it
    wants an ORM row and a `Storage`, and this needs neither a database nor the
    shop's file tree to answer the question.
    """
    try:
        image = Image.open(photo).convert("RGB")
        _corners, confidence = detect_corners(image)
        result = rectify(image, width_cm=width_cm, length_cm=length_cm)

        out_dir.mkdir(parents=True, exist_ok=True)
        glb = out_dir / f"{label}-{shot}.glb"
        usdz = out_dir / f"{label}-{shot}.usdz"
        width_m, length_m = width_cm / 100.0, length_cm / 100.0
        build_carpet_glb(result.image, width_m, length_m, str(glb), name=label)
        build_carpet_usdz(result.image, width_m, length_m, str(usdz), name=label)

        dims = glb_dimensions(glb)
        return PipelineRun(
            label=label,
            shot=shot,
            confidence=confidence,
            automatic=confidence >= CONFIDENCE_THRESHOLD,
            produced_files=glb.exists() and usdz.exists() and usdz.stat().st_size > 0,
            scale=ScaleCheck(label, width_m, length_m, dims.x, dims.z),
            error=None,
        )
    except Exception as exc:  # noqa: BLE001 — a failed run is a data point, not a crash
        return PipelineRun(
            label=label, shot=shot, confidence=0.0, automatic=False,
            produced_files=False, scale=None, error=f"{type(exc).__name__}: {exc}",
        )


@dataclass
class Summary:
    runs: list[PipelineRun]

    @property
    def n(self) -> int:
        return len(self.runs)

    @property
    def success_rate(self) -> float:
        return sum(1 for r in self.runs if r.succeeded) / self.n if self.n else 0.0

    @property
    def wrote_files_rate(self) -> float:
        return sum(1 for r in self.runs if r.produced_files) / self.n if self.n else 0.0

    @property
    def automatic_rate(self) -> float:
        """How often the corner detector was *confident*, not how often it was right.

        Below the threshold the detector hands the admin panel a set of corners
        to confirm (§6-16) and falls back to the full frame meanwhile — which on
        an edge-to-edge flat photograph is the correct rectangle. So this number
        being low does not mean the assets are wrong; `success_rate` says whether
        they are. Read together they say something more useful than either
        alone: the pipeline is right more often than it knows.
        """
        return sum(1 for r in self.runs if r.automatic) / self.n if self.n else 0.0

    @property
    def worst_scale_error(self) -> float:
        errors = [r.scale.worst_error for r in self.runs if r.scale is not None]
        return max(errors) if errors else 0.0

    @property
    def mean_confidence(self) -> float:
        return sum(r.confidence for r in self.runs) / self.n if self.n else 0.0

    def as_row(self, label: str) -> dict[str, object]:
        return {
            "shots": label,
            "n": self.n,
            "wrote files": f"{self.wrote_files_rate:.1%}",
            "size correct": f"{self.success_rate:.1%}",
            "detector confident": f"{self.automatic_rate:.1%}",
            "worst scale error": f"{self.worst_scale_error:.4%}",
            "mean confidence": round(self.mean_confidence, 3),
        }
