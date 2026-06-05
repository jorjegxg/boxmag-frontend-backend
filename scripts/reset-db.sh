#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/boxmag-backend"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
ENSURE_DOCKER_SCRIPT="$ROOT_DIR/scripts/ensure-docker.sh"
RESET_SCRIPT="$BACKEND_DIR/db/reset_and_seed.sh"

if ! command -v npm >/dev/null 2>&1; then
  echo "Eroare: npm nu este instalat sau nu este in PATH."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Eroare: docker nu este instalat sau nu este in PATH."
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Eroare: folderul boxmag-backend nu a fost gasit."
  exit 1
fi

chmod +x "$ENSURE_DOCKER_SCRIPT" "$RESET_SCRIPT" 2>/dev/null || true

echo "==> Reset DB + MinIO (stare initiala: catalog cutii, fara comenzi/utilizatori)"
echo ""

bash "$ENSURE_DOCKER_SCRIPT"

wait_for_mysql() {
  local attempts="${1:-60}"
  local delay_seconds="${2:-2}"

  echo "-> Astept ca MySQL sa fie gata..."
  for ((i = 1; i <= attempts; i++)); do
    if docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc \
      'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
      echo "-> MySQL este gata."
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "Eroare: MySQL nu a raspuns in timp util."
  return 1
}

wait_for_mysql

if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
  echo "-> Instalez dependentele backend (prima rulare)..."
  npm install --prefix "$BACKEND_DIR"
fi

bash "$RESET_SCRIPT"

echo ""
echo "Gata. DB si MinIO sunt la starea initiala (produse, preturi, poze cutii)."
