#!/usr/bin/env bash
# Provision PostgreSQL + pgvector inside the WSL Ubuntu distro for local work.
#
# The Windows side reaches it at localhost:5432, which matches the default
# database_url in app/core/config.py, so nothing else needs configuring.
#
# Safe to re-run: every step checks before it acts.
#
#     wsl -d Ubuntu -u root -- bash /path/to/setup-wsl-postgres.sh

set -euo pipefail

DB_USER=farsh
DB_PASS=farsh
DB_NAME=farsh

say() { printf '\n=== %s\n' "$1"; }

say "installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq postgresql postgresql-contrib >/dev/null

PG_VER="$(ls /etc/postgresql | sort -V | tail -1)"
say "postgresql $PG_VER"

apt-get install -y -qq "postgresql-${PG_VER}-pgvector" >/dev/null

CONF_DIR="/etc/postgresql/${PG_VER}/main"

say "opening the port to the windows host"
# WSL2 forwards the Windows loopback into the distro, but the server still has
# to listen on more than its own loopback for that hand-off to land.
sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" "$CONF_DIR/postgresql.conf"
if ! grep -q "carpet-dev" "$CONF_DIR/pg_hba.conf"; then
    cat >>"$CONF_DIR/pg_hba.conf" <<'HBA'
# carpet-dev: development access from the Windows host over the WSL NAT
host    all    all    127.0.0.1/32      scram-sha-256
host    all    all    172.16.0.0/12     scram-sha-256
host    all    all    192.168.0.0/16    scram-sha-256
HBA
fi

say "starting the server"
pg_ctlcluster "$PG_VER" main start 2>/dev/null || service postgresql restart

say "creating role and database"
role_exists() { su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='$1'\"" | grep -q 1; }
db_exists() { su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='$1'\"" | grep -q 1; }

role_exists "$DB_USER" || su postgres -c \
    "psql -qc \"CREATE ROLE $DB_USER LOGIN SUPERUSER PASSWORD '$DB_PASS'\""
db_exists "$DB_NAME" || su postgres -c "createdb -O $DB_USER $DB_NAME"
su postgres -c "psql -qd $DB_NAME -c 'CREATE EXTENSION IF NOT EXISTS vector'"

say "keeping it running across restarts"
# A boot command rather than systemd: systemd never reached "running" on this
# setup (systemctl reported the system as offline), while the boot command is
# honoured by every WSL version we care about.
if [ ! -f /etc/wsl.conf ] || ! grep -q "service postgresql start" /etc/wsl.conf; then
    cat >/etc/wsl.conf <<'WSLCONF'
[boot]
command = service postgresql start

[interop]
appendWindowsPath=true
WSLCONF
    echo "wrote /etc/wsl.conf — run 'wsl --shutdown' once so it takes effect"
fi

say "verifying"
su postgres -c "psql -qd $DB_NAME -tAc \"SELECT 'pgvector ' || extversion FROM pg_extension WHERE extname='vector'\""
su postgres -c "psql -tAc 'SELECT version()'" | cut -c1-40
echo
echo "ready:  postgresql+asyncpg://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo
echo "WSL stops a distribution seconds after its last process exits, and the"
echo "server goes with it. Start each working session from Windows with:"
echo "    pwsh scripts/dev-db.ps1"
