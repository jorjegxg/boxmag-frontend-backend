#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
SEED_FILE="$SCRIPT_DIR/reset_and_seed.sql"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found"
  exit 1
fi

echo "Resetting and seeding MySQL database..."
docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < "$SEED_FILE"

echo "Done. Database was reset and seeded."
