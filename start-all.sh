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

is_cursor_terminal() {
  [[ "${TERM_PROGRAM:-}" == "vscode" ]] \
    || [[ -n "${CURSOR_TRACE_ID:-}" ]] \
    || [[ -n "${VSCODE_IPC_HOOK:-}" ]] \
    || [[ -n "${VSCODE_GIT_IPC_HANDLE:-}" ]]
}

run_dev_servers_in_current_terminal() {
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
  echo "Servicii pornite in acest terminal Cursor:"
  echo "- DB: docker compose (MySQL + MinIO)"
  echo "- Backend: http://localhost:3001 (sau portul configurat)"
  echo "- Frontend: http://localhost:3006"
  echo ""
  echo "Apasa Ctrl+C pentru a opri backend/frontend."

  wait "$BACKEND_PID" "$FRONTEND_PID"
}

if is_cursor_terminal; then
  run_dev_servers_in_current_terminal
elif [[ "$is_windows_shell" == true ]]; then
  ROOT_WIN_PATH="$(cd "$ROOT_DIR" && pwd -W)"
  BACKEND_WIN_PATH="${ROOT_WIN_PATH}\\boxmag-backend"
  FRONTEND_WIN_PATH="${ROOT_WIN_PATH}\\boxmag4"

  echo "-> Pornesc backend in terminal separat..."
  powershell.exe -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/k','cd /d ""$BACKEND_WIN_PATH"" && npm run dev'"

  echo "-> Pornesc frontend in terminal separat..."
  powershell.exe -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/k','cd /d ""$FRONTEND_WIN_PATH"" && npm run dev'"

  echo ""
  echo "Servicii pornite:"
  echo "- DB: docker compose (MySQL + MinIO) — Docker Desktop pornit daca era oprit"
  echo "- Backend: terminal separat (boxmag-backend)"
  echo "- Frontend: terminal separat (boxmag4)"
  echo ""
  echo "Pentru terminale integrate Cursor: ruleaza din terminalul Cursor"
  echo "  ./start-all.sh"
  echo "sau Tasks: Run Task -> Start All (Ctrl+Shift+B)."
else
  run_dev_servers_in_current_terminal
fi
