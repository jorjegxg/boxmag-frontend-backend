#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/boxmag-backend"
FRONTEND_DIR="$ROOT_DIR/boxmag4"

if ! command -v docker >/dev/null 2>&1; then
  echo "Eroare: docker nu este instalat sau nu este in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Eroare: npm nu este instalat sau nu este in PATH."
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Eroare: folderele backend/frontend nu au fost gasite."
  exit 1
fi

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "Atentie: fisierul .env lipseste in radacina. Docker Compose va folosi valorile default."
fi

echo "-> Pornesc containerele DB existente (MySQL + MinIO)..."
if ! docker compose -f "$ROOT_DIR/docker-compose.yml" start mysql minio; then
  echo "Eroare: containerele mysql/minio nu exista inca."
  echo "Ruleaza o singura data: docker compose -f \"$ROOT_DIR/docker-compose.yml\" up -d"
  exit 1
fi

is_windows_shell=false
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    is_windows_shell=true
    ;;
esac

if [[ "$is_windows_shell" == true ]]; then
  ROOT_WIN_PATH="$(cd "$ROOT_DIR" && pwd -W)"
  BACKEND_WIN_PATH="${ROOT_WIN_PATH}\\boxmag-backend"
  FRONTEND_WIN_PATH="${ROOT_WIN_PATH}\\boxmag4"

  echo "-> Pornesc backend in terminal separat..."
  powershell.exe -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/k','cd /d ""$BACKEND_WIN_PATH"" && npm run dev'"

  echo "-> Pornesc frontend in terminal separat..."
  powershell.exe -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/k','cd /d ""$FRONTEND_WIN_PATH"" && npm run dev'"

  echo ""
  echo "Servicii pornite:"
  echo "- DB: docker compose (MySQL + MinIO)"
  echo "- Backend: terminal separat (boxmag-backend)"
  echo "- Frontend: terminal separat (boxmag-frontend)"
  echo ""
  echo "Scriptul se inchide aici. Procesele raman in ferestrele lor."
else
  echo "-> Pornesc backend..."
  (
    cd "$BACKEND_DIR"
    npm run dev
  ) &
  BACKEND_PID=$!

  echo "-> Pornesc frontend..."
  (
    cd "$FRONTEND_DIR"
    npm run dev
  ) &
  FRONTEND_PID=$!

  cleanup() {
    echo ""
    echo "-> Oprire procese..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    echo "-> Procese backend/frontend oprite."
  }

  trap cleanup INT TERM EXIT

  echo ""
  echo "Servicii pornite:"
  echo "- DB: docker compose (MySQL + MinIO)"
  echo "- Backend: http://localhost:3001 (sau portul configurat)"
  echo "- Frontend: http://localhost:3006"
  echo ""
  echo "Apasa Ctrl+C pentru a opri backend/frontend."

  wait "$BACKEND_PID" "$FRONTEND_PID"
fi
