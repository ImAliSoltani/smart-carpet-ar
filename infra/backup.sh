#!/usr/bin/env bash
# Nightly backup: the database and the files it points at, in one dated folder.
#
#   0 3 * * *  /srv/farsh/infra/backup.sh >> /var/log/farsh-backup.log 2>&1
#
# **Both halves or neither.** A `pg_dump` on its own restores a catalogue whose
# every photograph, every WebP derivative and every AR model is a broken link,
# because those live in a Docker volume and not in Postgres. That is the failure
# this script exists to prevent, so it takes the dump and the volume together
# and only marks the pair complete once both have been written.
#
# Restore is the reverse and is written out at the bottom of this file, because
# a backup nobody knows how to restore is a backup that does not exist.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$HERE/compose.prod.yml" --env-file "$HERE/.env")
DEST="${FARSH_BACKUP_DIR:-/var/backups/farsh}"
KEEP_DAYS="${FARSH_BACKUP_KEEP_DAYS:-14}"

# shellcheck disable=SC1091
source "$HERE/.env"

stamp="$(date +%Y-%m-%d_%H%M)"
# Written under a `.partial` name and renamed at the end. A backup interrupted
# halfway through must not be indistinguishable from a complete one — that is
# how a restore discovers the problem, at the worst possible moment.
work="$DEST/.partial-$stamp"
final="$DEST/$stamp"
mkdir -p "$work"

echo "[$(date -Is)] dumping database"
"${COMPOSE[@]}" exec -T db \
    pg_dump -U "$POSTGRES_USER" -d "${POSTGRES_DB:-farsh}" --format=custom \
    > "$work/db.dump"

echo "[$(date -Is)] archiving stored files"
# Read straight out of the named volume with a throwaway container, so the API
# does not have to be running and nothing is copied through it.
docker run --rm \
    -v farsh_storage:/storage:ro \
    -v "$work":/backup \
    alpine:3 tar czf /backup/storage.tar.gz -C /storage .

sha256sum "$work"/* > "$work/SHA256SUMS"
mv "$work" "$final"
echo "[$(date -Is)] complete: $final ($(du -sh "$final" | cut -f1))"

# Prune only *complete* backups; a `.partial-` left behind by a crash is
# evidence and is kept until someone looks at it.
find "$DEST" -maxdepth 1 -type d -name '20*' -mtime "+$KEEP_DAYS" -exec rm -rf {} +

# --- restoring ---------------------------------------------------------------
#
#   cd /srv/farsh
#   docker compose -f infra/compose.prod.yml --env-file infra/.env up -d db
#   docker compose -f infra/compose.prod.yml --env-file infra/.env exec -T db \
#       pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
#       < /var/backups/farsh/<stamp>/db.dump
#   docker run --rm -v farsh_storage:/storage -v /var/backups/farsh/<stamp>:/backup \
#       alpine:3 sh -c 'rm -rf /storage/* && tar xzf /backup/storage.tar.gz -C /storage'
#   docker compose -f infra/compose.prod.yml --env-file infra/.env up -d
#
# Then check one carpet's product page and one AR file. The dump restoring
# cleanly proves the rows are back; only a photograph loading proves the volume
# went with them.
