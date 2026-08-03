"""Write the OpenAPI document to a file, without starting a server.

The frontend generates its TypeScript types from this file, so the schema is
committed rather than fetched: the frontend build (and CI, which has no Python)
must not depend on a running backend. Re-run after any change to a route or a
schema — `scripts/check_openapi.py` fails the build if the committed file has
drifted.

    uv run python scripts/export_openapi.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

TARGET = Path(__file__).resolve().parents[1] / "openapi.json"


def document() -> str:
    # Trailing newline so the file is a well-behaved text file in git.
    return json.dumps(app.openapi(), indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def main() -> None:
    # newline="" leaves the "\n" above alone; the default would write CRLF on
    # Windows and hand git a file that differs from the one it stores.
    TARGET.write_text(document(), encoding="utf-8", newline="")
    print(f"wrote {TARGET.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
