"""Generate the bcrypt hash for ADMIN_PASSWORD_HASH in .env.

    uv run python scripts/hash_password.py "the-password"
"""

import sys

from app.services.auth import hash_password

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(1)
    print(hash_password(sys.argv[1]))
