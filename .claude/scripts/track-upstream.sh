#!/usr/bin/env bash
# Fetch each `pages[*].url` from src/web/dependencies/manifest.yaml,
# compute SHA256, compare to src/web/dependencies/upstream-hashes.json,
# and report drift. If a hash changed, snapshot the new content and
# update upstream-hashes.json. Downstream regeneration is a human task
# (or a subagent task for docs-librarian) — this script just flags.
#
# Usage: bash .claude/scripts/track-upstream.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

MANIFEST="src/web/dependencies/manifest.yaml"
HASHES="src/web/dependencies/upstream-hashes.json"
RUN_DIR=".claude/graphql-runs"
RUN_FILE="$RUN_DIR/$(date -u +%Y-%m-%dT%H-%M-%SZ)-track-upstream.md"

mkdir -p "$RUN_DIR"

log()  { printf "[track-upstream] %s\n" "$*"; }
fail() { printf "[track-upstream] ERROR: %s\n" "$*" >&2; exit 1; }

command -v python3 >/dev/null 2>&1 || fail "python3 required"
command -v curl    >/dev/null 2>&1 || fail "curl required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum required"

python3 -c 'import yaml' 2>/dev/null || fail "python3 pyyaml required (pip install pyyaml)"

# Extract pages[].url from manifest.yaml
urls=$(python3 -c "
import yaml
m = yaml.safe_load(open('$MANIFEST'))
for p in m.get('pages', []):
    print(p['url'])
")

current_hashes=$(python3 -c "
import json
h = json.load(open('$HASHES'))
for u, v in h.get('pages', {}).items():
    print(f'{u}\t{v[\"sha256\"]}')
")

{
  echo "# track-upstream run — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "| URL | previous sha256 | new sha256 | status |"
  echo "|---|---|---|---|"
} > "$RUN_FILE"

changed=0
unchanged=0
new=0

while IFS= read -r url; do
  [ -z "$url" ] && continue
  tmp=$(mktemp)
  if ! curl -sfL "$url" -o "$tmp"; then
    echo "| $url | — | — | FETCH FAILED |" >> "$RUN_FILE"
    rm -f "$tmp"
    continue
  fi

  new_sha=$(sha256sum "$tmp" | awk '{print $1}')
  prev=$(echo "$current_hashes" | awk -F'\t' -v u="$url" '$1==u {print $2}')

  if [ -z "$prev" ]; then
    status="NEW"
    new=$((new+1))
  elif [ "$prev" = "$new_sha" ]; then
    status="unchanged"
    unchanged=$((unchanged+1))
  else
    status="**CHANGED**"
    changed=$((changed+1))
    # Snapshot the new content
    slug=$(echo "$url" | sed 's|.*/||; s|\.md$||; s|[^a-zA-Z0-9._-]|-|g')
    snap_dir="src/web/tools/snapshots"
    # Try to use the downstream file's directory for snapshot location
    mkdir -p "$snap_dir"
    date_tag=$(date -u +%Y-%m-%d)
    cp "$tmp" "$snap_dir/${slug}-${date_tag}.md"
  fi

  echo "| $url | ${prev:-(none)} | $new_sha | $status |" >> "$RUN_FILE"
  rm -f "$tmp"
done <<< "$urls"

{
  echo
  echo "## Summary"
  echo
  echo "- changed:   $changed"
  echo "- unchanged: $unchanged"
  echo "- new:       $new"
  echo
  if [ "$changed" -gt 0 ] || [ "$new" -gt 0 ]; then
    echo "## Next steps"
    echo
    echo "- Invoke the \`docs-librarian\` subagent to regenerate"
    echo "  downstream files against the new snapshots."
    echo "- After regeneration, update \`upstream-hashes.json\` via"
    echo "  \`make graphql-web\` (idempotent)."
  fi
} >> "$RUN_FILE"

log "wrote $RUN_FILE"
log "changed=$changed  unchanged=$unchanged  new=$new"

# Update upstream-hashes.json if there were changes (only the hash
# field — snapshot paths stay human-curated via manifest.yaml).
if [ "$changed" -gt 0 ] || [ "$new" -gt 0 ]; then
  python3 - <<'PY'
import json, subprocess, yaml, os, datetime

REPO = os.getcwd()
manifest = yaml.safe_load(open(f"{REPO}/src/web/dependencies/manifest.yaml"))
hashes_path = f"{REPO}/src/web/dependencies/upstream-hashes.json"
data = json.load(open(hashes_path))

for p in manifest.get("pages", []):
    url = p["url"]
    try:
        h = subprocess.check_output(["bash", "-c", f"curl -sfL '{url}' | sha256sum | awk '{{print $1}}'"]).decode().strip()
    except subprocess.CalledProcessError:
        continue
    if not h:
        continue
    today = datetime.date.today().isoformat()
    entry = data.setdefault("pages", {}).setdefault(url, {})
    if entry.get("sha256") != h:
        entry["sha256"] = h
        entry["last_seen"] = today
        entry.setdefault("first_seen", today)

data["updated_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
with open(hashes_path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print("[track-upstream] upstream-hashes.json updated")
PY
fi
