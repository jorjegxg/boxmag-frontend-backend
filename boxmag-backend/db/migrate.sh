#!/usr/bin/env bash
# Apply pending SQL files under db/migrations/ in filename order.
# Records applied files in schema_migrations. Prefer idempotent migrations.
#
# Usage (repo root or boxmag-backend):
#   bash boxmag-backend/db/migrate.sh
#   npm run db:migrate   # from boxmag-backend
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed."
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: docker-compose.yml not found at $COMPOSE_FILE"
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Error: migrations directory missing: $MIGRATIONS_DIR"
  exit 1
fi

echo "==> Waiting for MySQL..."
for ((i = 1; i <= 60; i++)); do
  if docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc \
    'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
    echo "-> MySQL ready."
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "Error: MySQL did not become ready in time."
    exit 1
  fi
  sleep 2
done

# Run SQL from stdin against the compose MySQL service.
mysql_stdin() {
  docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc \
    'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
}

# Run a one-shot -e query; stdout is the result.
mysql_query() {
  local sql="$1"
  docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc \
    "mysql -N -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" \"\$MYSQL_DATABASE\" -e \"$sql\""
}

echo "==> Ensuring schema_migrations table exists..."
mysql_stdin <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schema_migrations_filename (filename)
);
SQL

applied_list="$(mysql_query "SELECT filename FROM schema_migrations ORDER BY filename;" || true)"

is_applied() {
  local name="$1"
  printf '%s\n' "$applied_list" | grep -Fxq "$name"
}

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
IFS=$'\n' files_sorted=($(printf '%s\n' "${files[@]}" | sort))
unset IFS

if [[ ${#files_sorted[@]} -eq 0 ]]; then
  echo "No migration files found."
  exit 0
fi

pending=0
for file in "${files_sorted[@]}"; do
  filename="$(basename "$file")"
  if is_applied "$filename"; then
    echo "-> skip $filename (already applied)"
    continue
  fi

  echo "-> apply $filename"
  mysql_stdin < "$file"

  # Escape single quotes in filename for SQL literal (filenames are controlled).
  safe_name="${filename//\'/\'\'}"
  mysql_query "INSERT INTO schema_migrations (filename) VALUES ('${safe_name}');"

  pending=$((pending + 1))
done

if [[ "$pending" -eq 0 ]]; then
  echo "==> Migrations up to date."
else
  echo "==> Applied $pending migration(s)."
fi
