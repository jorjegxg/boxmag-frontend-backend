#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found"
  exit 1
fi

echo "Running box type product schema migration..."
docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < "$SCRIPT_DIR/add_product_data_to_box_types.sql"

echo "Running box type product seed..."
docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < "$SCRIPT_DIR/seed_box_type_products_from_products.sql"

echo "Done. Product tables are migrated and seeded."
