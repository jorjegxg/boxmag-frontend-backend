#!/usr/bin/env bash
# Production redeploy (manual or GitHub Actions on push to main).
# This is the ONLY safe prod path — never wipe/reset the live DB.
# Wipe/bootstrap: ALLOW_PROD_WIPE=1 bash scripts/run-production.sh (empty hosts only).
# Host nginx must proxy to 127.0.0.1 upstreams as in deploy/nginx/boxmag.conf.example.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Boxmag deploy: $ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Eroare: docker nu este instalat."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Eroare: docker compose nu este disponibil."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Eroare: lipseste .env pe server. Copiaza din .env.example si completeaza valorile de productie."
  exit 1
fi

echo "==> Actualizez codul din main..."
git fetch origin main
git checkout main
git pull --ff-only origin main

echo "==> Pornesc dependinte (MySQL, MinIO)..."
docker compose up -d mysql minio

echo "==> Aplic migrari schema (boxmag-backend/db/migrations)..."
bash "$ROOT_DIR/boxmag-backend/db/migrate.sh"

echo "==> Build si restart aplicatie (backend + frontend)..."
docker compose --profile app up -d --build --remove-orphans

echo "==> Curatare imagini Docker nefolosite..."
docker image prune -f

echo "==> Deploy finalizat."
docker compose --profile app ps
