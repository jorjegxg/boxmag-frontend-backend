#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

is_windows_shell=false
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    is_windows_shell=true
    ;;
esac

docker_daemon_ready() {
  docker info >/dev/null 2>&1
}

start_docker_desktop_windows() {
  local candidates=(
    "/c/Program Files/Docker/Docker/Docker Desktop.exe"
    "${PROGRAMFILES:-}/Docker/Docker/Docker Desktop.exe"
    "${LOCALAPPDATA:-}/Programs/Docker/Docker/Docker Desktop.exe"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate" ]]; then
      echo "-> Pornesc Docker Desktop..."
      local win_path="$candidate"
      if command -v cygpath >/dev/null 2>&1; then
        win_path="$(cygpath -w "$candidate")"
      fi
      # Fara `cmd /c start` — evita fereastra consola noua.
      powershell.exe -NoProfile -Command "Start-Process -FilePath '$win_path'" >/dev/null
      return 0
    fi
  done

  echo "Eroare: Docker Desktop nu a fost gasit. Porneste-l manual din Start Menu."
  return 1
}

wait_for_docker_daemon() {
  local attempts="${1:-90}"
  local delay_seconds="${2:-2}"

  echo "-> Astept ca Docker daemon sa fie disponibil..."
  for ((i = 1; i <= attempts; i++)); do
    if docker_daemon_ready; then
      echo "-> Docker este gata."
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "Eroare: Docker daemon nu a raspuns in timp util."
  return 1
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Eroare: docker nu este instalat sau nu este in PATH."
  exit 1
fi

if ! docker_daemon_ready; then
  if [[ "$is_windows_shell" == true ]]; then
    start_docker_desktop_windows
    wait_for_docker_daemon
  else
    echo "Eroare: Docker daemon nu ruleaza. Porneste Docker Desktop sau serviciul docker."
    exit 1
  fi
fi

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "Atentie: fisierul .env lipseste in radacina. Docker Compose va folosi valorile default."
fi

echo "-> Pornesc containerele DB (MySQL + MinIO)..."
if docker compose -f "$COMPOSE_FILE" start mysql minio 2>/dev/null; then
  echo "-> Containerele mysql/minio sunt pornite."
elif docker compose -f "$COMPOSE_FILE" up -d mysql minio; then
  echo "-> Containerele mysql/minio au fost create si pornite."
else
  echo "Eroare: nu am putut porni mysql/minio."
  exit 1
fi
