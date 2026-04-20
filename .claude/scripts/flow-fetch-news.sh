#!/usr/bin/env bash
# Fetch both claude-code CHANGELOG.md sources, hash them, compute the
# delta vs. the previous fetch, and write the result to
# .claude/graphql-runs/flow-news-<UTC-ISO>.json.
#
# Downstream (flow-generate.sh) reads the most recent flow-news-*.json
# and asks Claude to score the deltas against
# src/flow/news/emotion-rubric.md.
#
# Usage: bash .claude/scripts/flow-fetch-news.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

RUN_DIR=".claude/graphql-runs"
mkdir -p "$RUN_DIR"

TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$RUN_DIR/flow-news-$TS.json"
PREV="$(ls -1 "$RUN_DIR"/flow-news-*.json 2>/dev/null | sort | tail -n1 || true)"

# Source list — see src/flow/news/sources.md. Keep prefer-GitHub-raw order.
SOURCES=(
  "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md"
  "https://code.claude.com/docs/en/changelog.md"
)

log()  { printf "[flow-fetch-news] %s\n" "$*"; }
fail() { printf "[flow-fetch-news] ERROR: %s\n" "$*" >&2; exit 1; }

command -v curl     >/dev/null 2>&1 || fail "curl required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum required"
command -v python3  >/dev/null 2>&1 || fail "python3 required"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Fetch each source.
declare -a entries=()
for url in "${SOURCES[@]}"; do
  f="$tmpdir/$(printf '%s' "$url" | sha256sum | cut -c1-12).md"
  if ! curl -sfL "$url" -o "$f"; then
    log "WARN: fetch failed — $url"
    entries+=("$(python3 -c 'import json,sys; print(json.dumps({"url": sys.argv[1], "sha256": None, "error": "fetch_failed"}))' "$url")")
    continue
  fi
  sha="$(sha256sum "$f" | awk '{print $1}')"
  # Extract only the top H2 section (latest version) — keeps delta tight.
  top_section="$(python3 -c '
import sys, re
md = open(sys.argv[1]).read()
# Split on H2 headers; keep text up to the second H2.
parts = re.split(r"(?m)^## ", md)
if len(parts) < 2:
    print(md, end="")
else:
    print("## " + parts[1], end="")
' "$f")"
  entries+=("$(python3 -c '
import json, sys
print(json.dumps({
    "url":      sys.argv[1],
    "sha256":   sys.argv[2],
    "top_section": sys.argv[3],
}, ensure_ascii=False))
' "$url" "$sha" "$top_section")")
done

# Compute delta against previous run (simple: new lines in top_section).
delta="null"
if [ -n "$PREV" ] && [ -f "$PREV" ]; then
  delta="$(python3 -c '
import json, sys, difflib
prev = json.load(open(sys.argv[1]))
curr_entries = json.loads("[" + ",".join(sys.argv[2:]) + "]")
out = []
prev_by_url = {s["url"]: s.get("top_section","") for s in prev.get("sources", [])}
for s in curr_entries:
    p = prev_by_url.get(s["url"], "")
    c = s.get("top_section","")
    new_lines = [l for l in difflib.ndiff(p.splitlines(), c.splitlines()) if l.startswith("+ ")]
    out.append({"url": s["url"], "new_lines": [l[2:] for l in new_lines]})
print(json.dumps(out, ensure_ascii=False))
' "$PREV" "${entries[@]}")"
fi

python3 <<PY > "$OUT"
import json, sys
sources = [json.loads(e) for e in [$(printf '%s,' "${entries[@]}" | sed 's/,$//')]]
delta   = $delta
payload = {
    "fetched_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "sources":   sources,
    "delta":     delta,
}
print(json.dumps(payload, indent=2, ensure_ascii=False))
PY

log "wrote $OUT"
log "sources: ${#SOURCES[@]}, prev: ${PREV:-<none>}"
