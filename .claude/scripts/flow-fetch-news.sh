#!/usr/bin/env bash
# Fetch both claude-code CHANGELOG.md sources in parallel, hash them,
# compute the delta vs. the previous fetch, and write the result to
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

log()  { printf "[flow-fetch-news] %s\n" "$*" >&2; }
fail() { printf "[flow-fetch-news] ERROR: %s\n" "$*" >&2; exit 1; }

command -v curl      >/dev/null 2>&1 || fail "curl required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum required"
command -v python3   >/dev/null 2>&1 || fail "python3 required"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

entries_file="$tmpdir/entries.jsonl"
: > "$entries_file"

# Fetch each source in parallel, write one JSON object per line to entries_file.
fetch_one() {
  local url="$1"
  local slug; slug="$(printf '%s' "$url" | sha256sum | cut -c1-12)"
  local f="$tmpdir/$slug.md"
  local entry_tmp="$tmpdir/$slug.json"

  if ! curl -sfL "$url" -o "$f"; then
    log "WARN: fetch failed — $url"
    python3 -c '
import json, sys
print(json.dumps({"url": sys.argv[1], "sha256": None, "error": "fetch_failed"}, ensure_ascii=False))
' "$url" > "$entry_tmp"
    return
  fi
  local sha; sha="$(sha256sum "$f" | awk '{print $1}')"
  python3 - "$url" "$sha" "$f" > "$entry_tmp" <<'PY'
import json, re, sys
url, sha, path = sys.argv[1], sys.argv[2], sys.argv[3]
md = open(path).read()
parts = re.split(r"(?m)^## ", md)
top = md if len(parts) < 2 else "## " + parts[1]
print(json.dumps({"url": url, "sha256": sha, "top_section": top}, ensure_ascii=False))
PY
}

declare -a PIDS=()
for url in "${SOURCES[@]}"; do
  fetch_one "$url" &
  PIDS+=($!)
done
for pid in "${PIDS[@]}"; do
  wait "$pid" || true
done

# Concat per-source JSON files into one JSONL file. Hard-fail if every
# fetch_one failed — a totally-empty sources[] would silently mask a
# broken source list or network outage.
cat "$tmpdir"/*.json > "$entries_file" 2>/dev/null || true
successful=$(grep -c '"sha256":' "$entries_file" 2>/dev/null || echo 0)
[ "$successful" -gt 0 ] || fail "every source fetch failed — check network + SOURCES[]"

# Compute delta against previous run (new lines added in top_section per source).
delta_file="$tmpdir/delta.json"
if [ -n "$PREV" ] && [ -f "$PREV" ]; then
  python3 - "$PREV" "$entries_file" > "$delta_file" <<'PY'
import json, sys, difflib
prev = json.load(open(sys.argv[1]))
entries = [json.loads(l) for l in open(sys.argv[2]) if l.strip()]
prev_by_url = {s["url"]: s.get("top_section", "") for s in prev.get("sources", [])}
out = []
for s in entries:
    p = prev_by_url.get(s["url"], "")
    c = s.get("top_section", "")
    new = [l[2:] for l in difflib.ndiff(p.splitlines(), c.splitlines()) if l.startswith("+ ")]
    out.append({"url": s["url"], "new_lines": new})
print(json.dumps(out, ensure_ascii=False))
PY
else
  echo "null" > "$delta_file"
fi

# Assemble the final payload.
python3 - "$entries_file" "$delta_file" > "$OUT" <<PY
import json, sys, datetime
entries = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
delta_raw = open(sys.argv[2]).read().strip()
delta = None if delta_raw == "null" else json.loads(delta_raw)
payload = {
    "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    "sources":   entries,
    "delta":     delta,
}
print(json.dumps(payload, indent=2, ensure_ascii=False))
PY

log "wrote $OUT"
log "sources: ${#SOURCES[@]}, prev: ${PREV:-<none>}"
