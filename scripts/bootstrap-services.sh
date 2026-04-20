#!/usr/bin/env bash
# scripts/bootstrap-services.sh — Phase C.3 session-start bootstrap.
#
# Idempotent, fast (~200ms cache hit). Always exits 0 so a broken
# hook doesn't break session start (hooks-guide.md directive).
#
# Resolve mode from CLAUDE_CODE_REMOTE (ground-truth env var set
# only in cloud-code-on-the-web). Start the data plane. Persist
# DATABASE_URL / REDIS_URL / OTEL correlation into $CLAUDE_ENV_FILE
# so the session can read them without re-export.
#
# Warn-only auth sanity per D4+D6: CLAUDE_CODE_OAUTH_TOKEN presence,
# gh auth status. Never fails the hook.

set -uo pipefail   # intentionally no -e — failures must warn, not exit

mode="local"
if [[ "${CLAUDE_CODE_REMOTE:-}" == "true" ]]; then
  mode="cloud"
fi

# ---- Data plane ---------------------------------------------------
start_services_cloud() {
  # Cloud env: system services are on the base image per
  # /en/claude-code-on-the-web. Prefer them; fall back to compose.
  service postgresql start >/dev/null 2>&1 || \
    (command -v docker >/dev/null 2>&1 && docker compose up -d postgres) || true
  service redis-server start >/dev/null 2>&1 || \
    (command -v docker >/dev/null 2>&1 && docker compose up -d redis) || true
}

start_services_local() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    docker compose up -d postgres redis 2>/dev/null || true
  else
    # No docker — fall back to system services if present.
    service postgresql start >/dev/null 2>&1 || \
      (command -v brew >/dev/null 2>&1 && brew services start postgresql@16 >/dev/null 2>&1) || true
    service redis-server start >/dev/null 2>&1 || \
      (command -v brew >/dev/null 2>&1 && brew services start redis >/dev/null 2>&1) || true
  fi
}

case "$mode" in
  cloud) start_services_cloud ;;
  local) start_services_local ;;
esac

# ---- Session env --------------------------------------------------
if [[ -n "${CLAUDE_ENV_FILE:-}" ]]; then
  {
    echo "DATABASE_URL=postgres://claude:${POSTGRES_PASSWORD:-claude-dev}@localhost:5432/claude"
    echo "REDIS_URL=redis://localhost:6379"
    echo "OTEL_RESOURCE_ATTRIBUTES=service.name=agentdatamodels,session.id=${CLAUDE_CODE_REMOTE_SESSION_ID:-local},repo.name=agentdatamodels"
  } >> "$CLAUDE_ENV_FILE"
fi

# ---- Auth sanity (warn-only, per D4/D6) ---------------------------
if [[ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]] && ! claude config get authToken >/dev/null 2>&1; then
  echo "[bootstrap] WARN: CLAUDE_CODE_OAUTH_TOKEN not set and no /login detected. Run /install-github-app in the agentbloggers org, then /web-setup in this cloud env (or /login locally)." >&2
fi

if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    echo "[bootstrap] WARN: gh auth status failed. Run /web-setup (cloud) or 'gh auth login' (local)." >&2
  fi
fi

exit 0
