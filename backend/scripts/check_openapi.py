"""Fail if the committed OpenAPI document no longer matches the code.

The frontend's types are generated from `openapi.json`, so a stale file is worse
than no file: the storefront would keep type-checking cleanly against a contract
the backend has already stopped honouring, and the mismatch would only show up
as a runtime error in the browser. CI runs this so the failure lands on the
commit that caused it.

    uv run python scripts/check_openapi.py
"""

import sys

from export_openapi import TARGET, document


def main() -> int:
    if not TARGET.exists():
        print(f"{TARGET.name} is missing — run scripts/export_openapi.py", file=sys.stderr)
        return 1

    if TARGET.read_text(encoding="utf-8") != document():
        print(
            f"{TARGET.name} is out of date with the routes and schemas.\n"
            "Run `uv run python scripts/export_openapi.py`, then regenerate the\n"
            "frontend types with `npm run gen:api` and commit both.",
            file=sys.stderr,
        )
        return 1

    print(f"{TARGET.name} matches the code")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
