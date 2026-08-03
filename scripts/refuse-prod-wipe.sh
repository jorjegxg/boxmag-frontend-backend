#!/usr/bin/env bash
# Source from wipe-oriented scripts. Exits if NODE_ENV=production without ALLOW_PROD_WIPE=1.
#
# Usage: source "$(dirname "$0")/refuse-prod-wipe.sh"   # from scripts/
#        source "$REPO_ROOT/scripts/refuse-prod-wipe.sh"

_boxmag_resolve_node_env() {
  if [[ -n "${NODE_ENV:-}" ]]; then
    printf '%s' "$NODE_ENV"
    return
  fi
  local root="${BOXMAG_ROOT:-}"
  if [[ -z "$root" && -n "${BASH_SOURCE[0]:-}" ]]; then
    root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  fi
  if [[ -n "$root" && -f "$root/.env" ]]; then
    # shellcheck disable=SC2002
    local line
    line="$(grep -E '^[[:space:]]*NODE_ENV=' "$root/.env" | tail -n1 || true)"
    if [[ -n "$line" ]]; then
      printf '%s' "${line#*=}" | tr -d '"' | tr -d "'" | tr -d '[:space:]'
      return
    fi
  fi
  printf '%s' ""
}

refuse_prod_wipe() {
  local node_env
  node_env="$(_boxmag_resolve_node_env)"
  if [[ "$node_env" == "production" && "${ALLOW_PROD_WIPE:-}" != "1" ]]; then
    echo "Refusing wipe: NODE_ENV=production without ALLOW_PROD_WIPE=1."
    echo "Safe redeploy: bash scripts/deploy.sh"
    echo "Intentional empty-host bootstrap only:"
    echo "  ALLOW_PROD_WIPE=1 bash scripts/run-production.sh"
    exit 1
  fi
}
