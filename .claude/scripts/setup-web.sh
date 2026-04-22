#!/usr/bin/env bash
# Setup script for claude-code-on-the-web cloud sessions.
#
# Per /en/claude-code-on-the-web:
#   - gh is NOT preinstalled.
#   - Postgres + Redis ARE preinstalled but not running.
#   - Docker + docker compose ARE available.
#   - GH_TOKEN env var is read automatically by gh (no auth login needed).
#   - CLAUDE_CODE_REMOTE_SESSION_ID is set inside a cloud VM.
#
# Run this from the environment's setup-script field so every new cloud
# session comes up healthy.

set -euo pipefail

log() { printf "[setup-web] %s\n" "$*"; }

# ----- apt deps -----
# Per /en/claude-code-on-the-web: setup scripts run as root on
# Ubuntu 24.04, so `apt install` works directly — no sudo needed.
if ! command -v gh >/dev/null 2>&1; then
  log "installing gh"
  apt update && apt install -y gh
else
  log "gh already present: $(gh --version | head -1)"
fi

# yq and jq for the dependency tracker. jq is pre-installed per the
# guide's Utilities row, but install if missing on a drifted image.
for bin in jq yq curl; do
  command -v "$bin" >/dev/null 2>&1 || apt install -y "$bin"
done

# ----- services -----
log "starting postgresql"
service postgresql start || true

log "starting redis-server"
service redis-server start || true

# ----- gh auth check -----
if [ -z "${GH_TOKEN:-}" ]; then
  log "WARN: GH_TOKEN not set; gh will be unauthenticated"
else
  log "GH_TOKEN present; gh will auth automatically"
fi

# ----- session backlink -----
if [ -n "${CLAUDE_CODE_REMOTE_SESSION_ID:-}" ]; then
  log "session URL: https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID}"
fi

# ----- repo-local Python deps if needed by scripts -----
command -v python3 >/dev/null 2>&1 && \
  python3 -c 'import yaml, json' 2>/dev/null || \
  python3 -m pip install --quiet pyyaml

log "done"
