#!/usr/bin/env bash
# Ruleaza pe serverul de productie (manual sau automat via GitHub Actions la push pe main).
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

echo "==> Build si restart aplicatie (backend + frontend)..."
docker compose --profile app up -d --build --remove-orphans

echo "==> Curatare imagini Docker nefolosite..."
docker image prune -f

echo "==> Deploy finalizat."
docker compose --profile app ps
