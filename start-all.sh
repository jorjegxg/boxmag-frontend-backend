#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/boxmag-backend"
FRONTEND_DIR="$ROOT_DIR/boxmag4"
ENSURE_DOCKER_SCRIPT="$ROOT_DIR/scripts/ensure-docker.sh"

if ! command -v npm >/dev/null 2>&1; then
  echo "Eroare: npm nu este instalat sau nu este in PATH."
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Eroare: folderele backend/frontend nu au fost gasite."
  exit 1
fi

if [[ ! -x "$ENSURE_DOCKER_SCRIPT" ]]; then
  chmod +x "$ENSURE_DOCKER_SCRIPT" 2>/dev/null || true
fi

bash "$ENSURE_DOCKER_SCRIPT"

is_windows_shell=false
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    is_windows_shell=true
    ;;
esac

# Pe Windows/Git Bash, `npm.cmd` pornit in background deschide o consola noua.
# Rulam bin-urile din node_modules (scripturi sh + node) ca sa ramana in acest terminal.
run_backend() {
  cd "$BACKEND_DIR"
  if [[ "$is_windows_shell" == true && -f ./node_modules/.bin/ts-node-dev ]]; then
    # Evita npm.cmd (deschide consola noua in background pe Git Bash).
    bash ./node_modules/.bin/ts-node-dev --respawn --transpile-only src/server.ts
  else
    npm run dev
  fi
}

run_frontend() {
  cd "$FRONTEND_DIR"
  if [[ "$is_windows_shell" == true && -f ./node_modules/.bin/next ]]; then
    bash ./node_modules/.bin/next dev -p 3006
  else
    npm run dev
  fi
}

echo "-> Pornesc backend..."
run_backend &
BACKEND_PID=$!

echo "-> Pornesc frontend..."
run_frontend &
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
echo "Servicii pornite in acest terminal:"
echo "- DB: docker compose (MySQL + MinIO)"
echo "- Backend: http://localhost:3005"
echo "- Frontend: http://localhost:3006"
echo ""
echo "Apasa Ctrl+C pentru a opri backend/frontend."

wait "$BACKEND_PID" "$FRONTEND_PID"
