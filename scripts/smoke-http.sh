#!/usr/bin/env bash
# Smoke HTTP checks — run with backend :3005 and frontend :3006 up.
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3005}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3006}"

echo "[smoke] GET ${BACKEND_URL}/api/health"
curl -fsS "${BACKEND_URL}/api/health" | grep -q '"ok"' || {
  echo "[smoke] FAIL: backend health"
  exit 1
}

echo "[smoke] GET ${FRONTEND_URL}/"
curl -fsS -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/" | grep -Eq '^(200|301|302|307|308)$' || {
  echo "[smoke] FAIL: frontend home"
  exit 1
}

echo "[smoke] OK"
