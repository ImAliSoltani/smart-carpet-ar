"""Write the evaluation notebooks from one place, so they cannot drift apart.

    uv run python scripts/build_eval_notebooks.py

`.ipynb` is JSON with an execution counter and an output blob in it, which makes
a hand-edited notebook a file that is diffed by nobody and reviewed by nobody.
ROADMAP §11 already says notebooks are for evaluation only and hold no logic —
so what is left in them is a few calls into `app.eval` and the prose around the
numbers, and that is small enough to generate.

The notebooks are committed unexecuted. Running them is the reader's job, and a
committed output is a claim about a machine nobody else has.
"""

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUT = Path(__file__).resolve().parent.parent.parent / "notebooks"


def md(text: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": text.strip().splitlines(keepends=True),
    }


def code(text: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": text.strip().splitlines(keepends=True),
    }


NOTEBOOK_META = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3.12"},
}


PREAMBLE = """
import sys
from pathlib import Path

# The notebooks live beside the backend, not inside it, so that `app` is
# importable exactly the way the server imports it — same package, same module
# state, no copy.
sys.path.insert(0, str(Path.cwd().parent / "backend"))
"""


RETRIEVAL = [
    md(
        """
# ارزیابی جست‌وجوی بصری

**پرسش:** وقتی خریدار از فرشی عکس می‌گیرد، همان فرش چندم می‌آید؟

**مجموعه‌ی پرسش، دیده‌نشده به‌طور ساختاری.** در `ingest_catalog.py` فقط تصویر
`flat` هر فرش امبد می‌شود، پس سه تصویر دیگرِ همان فرش — `cover`، `room`،
`gallery` — تصویرهایی هستند که ایندکس هرگز ندیده است. برچسب هم لازم ندارند:
نام فایل، اسلاگ فرش را با خود دارد.

**۱۲۰ پرسش، ۴۰ فرش، یک پاسخ درست برای هر پرسش.** با یک پاسخ درست،
Precision@k به‌طور مکانیکی همان hit@k/k است و اطلاعات تازه‌ای ندارد؛ پس عدد
اصلی «نرخ اصابت» است و کنارش MRR، که تنها عددی است که تفاوت رتبه‌ی ۲ و ۲۰ را
می‌بیند.
"""
    ),
    code(PREAMBLE),
    code(
        """
import asyncio

from app.db.session import SessionLocal
from app.eval import retrieval
from app.services import query_windows
from app.services.embeddings import DinoV2Backend, get_embedding_backend

embedder = get_embedding_backend()
assert isinstance(embedder, DinoV2Backend), (
    "امبدینگ واقعی لازم است: uv sync --group ml. "
    "با بک‌اند قلابی هر عددی که اینجا چاپ شود نویز است."
)
"""
    ),
    md(
        """
## دو پیکربندی روی یک مجموعه‌ی پرسش

- **کل کادر** — آنچه تا پیش از فاز ۵ اجرا می‌شد: یک بردار از تمام تصویر.
- **هفت پنجره** — تصویر به پنجره‌های هم‌پوشان بریده می‌شود، هر پنجره جست‌وجو
  می‌شود، و هر فرش بهترین امتیازی را که هر پنجره‌ای به او داده نگه می‌دارد.
  کادر کامل خودش یکی از پنجره‌هاست، پس نتیجه نمی‌تواند از حالت قبل بدتر باشد.
"""
    ),
    code(
        """
async def measure():
    async with SessionLocal() as session:
        slugs = await retrieval.active_slugs(session)
        depth = await retrieval.catalogue_size(session)
        queries = retrieval.collect_queries(Path.cwd().parent / "data" / "catalog-gen", slugs=slugs)
        whole = await retrieval.evaluate(
            session, queries, embedder=embedder, label="کل کادر", depth=depth
        )
        windowed = await retrieval.evaluate_windowed(
            session, queries, embedder=embedder,
            label=f"×{len(query_windows.DEFAULT_GRID)} پنجره", depth=depth,
        )
        return queries, [whole, windowed]

queries, runs = asyncio.run(measure())
print(f"{len(queries)} پرسش")
"""
    ),
    code(
        """
import pandas as pd

pd.DataFrame([run.metrics().as_row() for run in runs])
"""
    ),
    md(
        """
## به تفکیک نوع عکس

هر سه، عکسی از همان فرش‌اند؛ تفاوتشان این است که فرش چقدر از کادر را می‌گیرد.
"""
    ),
    code(
        """
pd.DataFrame(
    [run.metrics(shot=shot).as_row() for shot in retrieval.HELD_OUT_SHOTS for run in runs]
)
"""
    ),
    code(
        """
import matplotlib.pyplot as plt

shots = list(retrieval.HELD_OUT_SHOTS)
fig, ax = plt.subplots(figsize=(7, 3.6))
width = 0.36
for offset, run in zip((-width / 2, width / 2), runs):
    ax.bar(
        [i + offset for i in range(len(shots))],
        [run.metrics(shot=s).hit_rate[1] for s in shots],
        width=width,
        label=run.label,
    )
ax.set_xticks(range(len(shots)))
ax.set_xticklabels(shots)
ax.set_ylabel("hit@1")
ax.set_ylim(0, 1)
ax.legend()
ax.set_title("rank-1 retrieval by shot type")
plt.tight_layout()
"""
    ),
    md(
        """
## Precision@k

با یک قلم مرتبط در هر پرسش این عدد از hit@k مشتق می‌شود و چیز تازه‌ای
نمی‌گوید — اینجا هست چون نقشه‌ی راه با همین نام خواسته بودش.
"""
    ),
    code(
        """
pd.DataFrame(
    [
        {"config": run.label, **{f"P@{k}": round(run.metrics().precision_at(k), 4)
                                 for k in retrieval.CUTOFFS}}
        for run in runs
    ]
)
"""
    ),
    md(
        """
## آنچه شکست می‌خورد

پرسش‌هایی که هنوز رتبه‌ی اول را نمی‌گیرند، برای اینکه در فصل ارزیابی درباره‌شان
حرفی زده شود نه اینکه فقط میانگین گزارش شود.
"""
    ),
    code(
        """
worst = sorted(
    (r for r in runs[-1].rankings if r.rank is None or r.rank > 3),
    key=lambda r: (r.rank is None, r.rank or 0),
    reverse=True,
)
pd.DataFrame(
    [{"slug": r.query.slug, "shot": r.query.shot, "rank": r.rank} for r in worst[:15]]
)
"""
    ),
]


AR = [
    md(
        """
# ارزیابی پایپ‌لاین واقعیت افزوده

دو پرسش، که به دو شکل متفاوت شکست می‌خورند:

1. **مقیاس** — فاصله‌ی بین اندازه‌ای که در دیتابیس نوشته شده و اندازه‌ای که در
   خودِ فایل `.glb` پخته شده. این نصفِ خودکارشدنیِ بند ۳-۱ است و باید دقیق
   باشد؛ اندازه حساب است، نه تخمین. نصف دیگر — خطا در برابر متر روی کف واقعی —
   کار کارفرماست (بند ۱۲) و هیچ کدی جایش را نمی‌گیرد. کاری که این نوت‌بوک
   می‌کند این است که آن اندازه‌گیری را **تفسیرپذیر** کند: اگر فایل تا میکرومتر
   درست باشد و گوشی ۴٪ خطا بدهد، خطا در جلسه‌ی AR است نه در پایپ‌لاین.
2. **نرخ موفقیت روی ورودی دیده‌نشده** — همان فرش‌ها، ولی از عکس‌های `cover` و
   `gallery` که پایپ‌لاین برایشان ساخته نشده.
"""
    ),
    code(PREAMBLE),
    code(
        """
from tempfile import TemporaryDirectory

import pandas as pd

sys.path.insert(0, str(Path.cwd().parent / "backend" / "scripts"))
from app.eval.ar_assets import Summary, run_pipeline_on
from catalog_profiles import PROFILES

SOURCE = Path.cwd().parent / "data" / "catalog-gen"
SHOTS = ("flat", "cover", "gallery")
"""
    ),
    code(
        """
by_shot = {shot: [] for shot in SHOTS}
with TemporaryDirectory() as tmp:
    out = Path(tmp)
    for profile in PROFILES:
        for shot in SHOTS:
            found = sorted(SOURCE.glob(f"{profile.slug}__{shot}.*"))
            if not found:
                continue
            for width_cm, length_cm, *_ in profile.variants:
                by_shot[shot].append(
                    run_pipeline_on(
                        found[0], width_cm=width_cm, length_cm=length_cm, out_dir=out,
                        label=f"{profile.slug}-{width_cm}x{length_cm}", shot=shot,
                    )
                )

pd.DataFrame([Summary(runs).as_row(shot) for shot, runs in by_shot.items()])
"""
    ),
    md(
        """
## چرا «اطمینان تشخیص» و «اندازه‌ی درست» دو ستون جدا هستند

اولین اجرای این اندازه‌گیری هر دو را در یک عدد جمع کرده بود و نتیجه «۰٪ موفقیت»
شد — درباره‌ی مجموعه‌ای از فایل‌ها که **همه‌شان درست بودند**. اطمینان،
*تشخیص‌دهنده‌ی گوشه* را نمره می‌دهد؛ وقتی پایین باشد، تشخیص به کل کادر برمی‌گردد،
و برای عکس تختی که فرش لبه‌به‌لبه پرش کرده، همان جواب درست است. دو چیز متفاوت
با یک عدد گزارش نمی‌شوند.
"""
    ),
    code(
        """
everything = Summary([r for runs in by_shot.values() for r in runs])
scale_errors = [r.scale.worst_error for runs in by_shot.values() for r in runs if r.scale]
print(f"n = {everything.n}")
print(f"بدترین خطای مقیاس: {max(scale_errors):.6%}")
print(f"اندازه‌ی درست: {everything.success_rate:.1%}")
print(f"اطمینان تشخیص گوشه: {everything.automatic_rate:.1%}")
"""
    ),
    md(
        """
# ارزیابی راهنمای اندازه

کل پاسخِ «چه اندازه فرشی جا می‌شود» زیر یک عدد است: هر پیکسل چند متر ارزش
دارد. برگه‌ی A4 آن عدد را از حدس به اندازه‌گیری تبدیل می‌کند، چون ISO 216
ابعادش را دقیق تعریف کرده.

روی صحنه‌های **مصنوعی** سنجیده می‌شود و این انتخاب دلیل دارد: عکس یک اتاق واقعی
حقیقتِ زمینی ندارد، پس خطای محاسبه‌شده در برابرش خطا در برابر یک تخمین دیگر
است. اینجا صفحه‌ی کف، دوربین و جای برگه ساخته می‌شوند، پس مقیاس درست تا دقت
ماشین معلوم است.
"""
    ),
    code(
        """
from app.eval.sizing import Report, default_scenes, run

trials = run(default_scenes())
pd.DataFrame([Report(trials).as_row("همه")])
"""
    ),
    md(
        """
## آنچه دقت را تعیین می‌کند: اندازه‌ی برگه در کادر

تصحیح گوشه تا حدود نیم پیکسل کار می‌کند و اندازه‌گیری بر طول ضلع برگه تقسیم
می‌شود — پس دقت را بزرگیِ برگه در کادر تعیین می‌کند، و آن تنها چیزی است که
خریدار کنترلش می‌کند: نزدیک‌تر بایستد.
"""
    ),
    code(
        """
buckets = [(0, 55), (55, 75), (75, 100), (100, 10_000)]
pd.DataFrame(
    [
        Report([t for t in trials if lo <= t.sheet_px < hi]).as_row(
            f"{lo}–{hi if hi < 10_000 else '∞'} px"
        )
        for lo, hi in buckets
    ]
)
"""
    ),
    code(
        """
import matplotlib.pyplot as plt

found = [t for t in trials if t.error is not None]
fig, ax = plt.subplots(figsize=(7, 3.6))
ax.scatter([t.sheet_px for t in found], [t.error * 100 for t in found], s=14, alpha=0.6)
ax.axhline(3.0, linestyle="--", linewidth=1)
ax.set_xlabel("sheet's longest side (px)")
ax.set_ylabel("scale error (%)")
ax.set_title("A4 reference: accuracy against how large the sheet is in frame")
plt.tight_layout()
"""
    ),
]


def write(name: str, cells: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    path.write_text(
        json.dumps(
            {"cells": cells, "metadata": NOTEBOOK_META, "nbformat": 4, "nbformat_minor": 5},
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"{path}  ({len(cells)} سلول)")


if __name__ == "__main__":
    write("01-visual-search.ipynb", RETRIEVAL)
    write("02-ar-and-size-guide.ipynb", AR)
