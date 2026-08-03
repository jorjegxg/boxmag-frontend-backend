#!/usr/bin/env bash
# Fresh production bootstrap: wipe MySQL + MinIO volumes, reseed catalog/images,
# then build and start backend + frontend (docker compose --profile app).
#
# Safe redeploy without data wipe: use scripts/deploy.sh instead.
# Never wipe a live DB. This script requires ALLOW_PROD_WIPE=1 when NODE_ENV=production.
#
# Usage (from repo root, on the production host):
#   ALLOW_PROD_WIPE=1 bash scripts/run-production.sh              # interactive confirm
#   ALLOW_PROD_WIPE=1 bash scripts/run-production.sh --yes        # non-interactive
#   ALLOW_PROD_WIPE=1 bash scripts/run-production.sh --pull --yes # git pull main first
#   ALLOW_PROD_WIPE=1 bash scripts/run-production.sh --no-cache --yes
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=refuse-prod-wipe.sh
BOXMAG_ROOT="$ROOT_DIR" source "$ROOT_DIR/scripts/refuse-prod-wipe.sh"
refuse_prod_wipe

COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
SEED_SQL="$ROOT_DIR/boxmag-backend/db/reset_and_seed.sql"
SEED_IMAGES_JS="$ROOT_DIR/boxmag-backend/db/seed_minio_images.js"

DO_PULL=false
DO_YES=false
NO_CACHE=false

for arg in "$@"; do
  case "$arg" in
    --pull) DO_PULL=true ;;
    --yes|-y) DO_YES=true ;;
    --no-cache) NO_CACHE=true ;;
    --help|-h)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Use --help for usage."
      exit 1
      ;;
  esac
done

echo "==> Boxmag production bootstrap: $ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose is not available."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Error: missing .env. Copy .env.example and fill production values."
  exit 1
fi

if [[ ! -f "$SEED_SQL" || ! -f "$SEED_IMAGES_JS" ]]; then
  echo "Error: seed files missing under boxmag-backend/db/."
  exit 1
fi

if ! grep -qE '^[[:space:]]*NODE_ENV=production([[:space:]]|$)' .env; then
  echo "Warning: NODE_ENV in .env is not set to production."
fi

echo ""
echo "WARNING: This will PERMANENTLY DELETE:"
echo "  - MySQL volume (all orders, users, addresses, catalog)"
echo "  - MinIO volume (all uploaded product images)"
echo "Then it reseeds catalog + box images and rebuilds app containers."
echo ""

if [[ "$DO_YES" != true ]]; then
  read -r -p "Type 'yes' to continue: " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

if [[ "$DO_PULL" == true ]]; then
  echo "==> Pulling latest main..."
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
fi

echo "==> Stopping app + removing MySQL/MinIO volumes..."
docker compose --profile app -f "$COMPOSE_FILE" down --remove-orphans || true
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans

echo "==> Starting MySQL + MinIO..."
docker compose -f "$COMPOSE_FILE" up -d mysql minio

wait_for_mysql() {
  local attempts="${1:-90}"
  local delay_seconds="${2:-2}"

  echo "-> Waiting for MySQL..."
  for ((i = 1; i <= attempts; i++)); do
    if docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc \
      'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
      echo "-> MySQL ready."
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "Error: MySQL did not become ready in time."
  return 1
}

compose_network() {
  docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' boxmag4-mysql
}

wait_for_minio() {
  local attempts="${1:-60}"
  local delay_seconds="${2:-2}"
  local network

  network="$(compose_network)"
  if [[ -z "$network" ]]; then
    echo "Error: could not detect Docker network for boxmag4-mysql."
    return 1
  fi

  echo "-> Waiting for MinIO..."
  for ((i = 1; i <= attempts; i++)); do
    if docker run --rm --network "$network" curlimages/curl:8.5.0 \
      -sf "http://minio:9000/minio/health/live" >/dev/null 2>&1; then
      echo "-> MinIO ready."
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "Error: MinIO did not become ready in time."
  return 1
}

wait_for_mysql
wait_for_minio

# Give MySQL a moment after ping to accept schema DDL
sleep 2

echo "==> Resetting and seeding MySQL (catalog, prices, shipping)..."
docker compose -f "$COMPOSE_FILE" exec -T mysql sh -lc \
  'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < "$SEED_SQL"

echo "==> Purging MinIO bucket and uploading seed box images..."
network="$(compose_network)"
if [[ -z "$network" ]]; then
  echo "Error: could not detect Docker network for boxmag4-mysql."
  exit 1
fi

docker run --rm \
  --network "$network" \
  --env-file "$ROOT_DIR/.env" \
  -e SEED_IN_DOCKER=1 \
  -e DB_HOST=mysql \
  -e DB_PORT=3306 \
  -e MINIO_ENDPOINT=minio \
  -e MINIO_PORT_API=9000 \
  -v "$ROOT_DIR:/repo:ro" \
  -w /repo/boxmag-backend \
  node:22-alpine \
  sh -c "npm ci --omit=dev && node db/seed_minio_images.js --purge"

echo "==> Building and starting backend + frontend..."
if [[ "$NO_CACHE" == true ]]; then
  docker compose --profile app -f "$COMPOSE_FILE" build --no-cache
  docker compose --profile app -f "$COMPOSE_FILE" up -d --remove-orphans
else
  docker compose --profile app -f "$COMPOSE_FILE" up -d --build --remove-orphans
fi

echo "==> Pruning unused Docker images..."
docker image prune -f

echo ""
echo "==> Production stack is up."
docker compose --profile app -f "$COMPOSE_FILE" ps

echo ""
echo "Frontend: http://localhost:3006"
echo "Backend:  http://localhost:3005 (or PORT from .env)"
echo "MinIO:    API :9000, console :9001"
echo ""
echo "Redeploy without wiping data: bash scripts/deploy.sh"
