#!/usr/bin/env bash
# GraphQL control-plane: for each watched repo in manifest.yaml,
# query GitHub GraphQL for:
#   - Latest release tag + published date
#   - HEAD commit oid on the default branch
# Then compare to the pin in manifest.yaml and flag drift.
#
# Requires: gh (authenticated via GH_TOKEN) + python3 + pyyaml.
#
# Usage: bash .claude/scripts/graphql-deps.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

MANIFEST="src/web/dependencies/manifest.yaml"
HASHES="src/web/dependencies/upstream-hashes.json"
RUN_DIR=".claude/graphql-runs"
RUN_FILE="$RUN_DIR/$(date -u +%Y-%m-%dT%H-%M-%SZ)-graphql-deps.md"

mkdir -p "$RUN_DIR"

log()  { printf "[graphql-deps] %s\n" "$*"; }
fail() { printf "[graphql-deps] ERROR: %s\n" "$*" >&2; exit 1; }

command -v gh      >/dev/null 2>&1 || fail "gh required (apt install gh)"
command -v python3 >/dev/null 2>&1 || fail "python3 required"
python3 -c 'import yaml' 2>/dev/null || fail "python3 pyyaml required"

# Auth check — gh reads GH_TOKEN automatically.
if ! gh auth status >/dev/null 2>&1; then
  log "WARN: gh not authenticated; public repos will work but rate-limited (60/hr)"
fi

# Extract (org, repo, pin) tuples from manifest.yaml
targets=$(python3 -c "
import yaml
m = yaml.safe_load(open('$MANIFEST'))
for org_key, org in m.get('orgs', {}).items():
    gh_owner = org_key
    for r in org.get('watched_repos', []) or []:
        print(f'{gh_owner}\t{r[\"name\"]}\t{r.get(\"pin\", \"latest\")}')
")

{
  echo "# graphql-deps run — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "| owner | repo | pin | latest_release | pin_matches | default_branch_HEAD |"
  echo "|---|---|---|---|---|---|"
} > "$RUN_FILE"

drift=0
ok=0

# One GraphQL query per repo (could be batched with aliases but this is
# clearer). Query shape:
#   repository(owner: $o, name: $r) {
#     defaultBranchRef { target { ... on Commit { oid committedDate } } }
#     releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
#       nodes { tagName publishedAt isPrerelease }
#     }
#   }

while IFS=$'\t' read -r owner repo pin; do
  [ -z "$owner" ] && continue

  result=$(gh api graphql -f query='
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        defaultBranchRef { target { ... on Commit { oid committedDate } } }
        releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes { tagName publishedAt isPrerelease }
        }
      }
    }
  ' -f owner="$owner" -f repo="$repo" 2>/dev/null || echo '{"errors":[{"message":"query failed"}]}')

  if echo "$result" | python3 -c 'import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get("data",{}).get("repository") else 1)' 2>/dev/null; then
    latest=$(echo "$result" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]["repository"]
rel = d["releases"]["nodes"]
print(rel[0]["tagName"] if rel else "(no releases)")
')
    head_oid=$(echo "$result" | python3 -c '
import sys, json
d = json.load(sys.stdin)["data"]["repository"]
t = d.get("defaultBranchRef", {}).get("target") or {}
print((t.get("oid") or "?")[:7])
')
    if [ "$pin" = "latest" ] || [ "$pin" = "main" ] || [ "$pin" = "$latest" ]; then
      match="✅"
      ok=$((ok+1))
    else
      match="⚠️ drift"
      drift=$((drift+1))
    fi
    echo "| $owner | $repo | $pin | $latest | $match | $head_oid |" >> "$RUN_FILE"
  else
    echo "| $owner | $repo | $pin | ERROR | ❌ | ERROR |" >> "$RUN_FILE"
  fi
done <<< "$targets"

{
  echo
  echo "## Summary"
  echo
  echo "- pins matching upstream: $ok"
  echo "- pins drifting:          $drift"
  echo
  echo "## How to refresh a pin"
  echo
  echo "1. Decide whether to adopt the new upstream version."
  echo "2. Update the \`pin\` field in \`src/web/dependencies/manifest.yaml\`."
  echo "3. Run \`make graphql-web\` again; the run report should show ✅."
  echo "4. If the package is used in \`package.json\` / \`requirements.txt\`,"
  echo "   update the lock file too."
} >> "$RUN_FILE"

log "wrote $RUN_FILE"
log "ok=$ok  drift=$drift"

# Update upstream-hashes.json with the release info we just observed.
python3 - <<PY
import json, datetime, subprocess, yaml, os
REPO = os.getcwd()
manifest = yaml.safe_load(open(f"{REPO}/src/web/dependencies/manifest.yaml"))
hashes_path = f"{REPO}/src/web/dependencies/upstream-hashes.json"
data = json.load(open(hashes_path))
data.setdefault("releases", {})
# Re-run the gh query for each repo (cheap; 50 total points/hr at 2 pts each).
for org_key, org in manifest.get("orgs", {}).items():
    for r in org.get("watched_repos", []) or []:
        key = f"{org_key}/{r['name']}"
        try:
            raw = subprocess.check_output(
                ["gh", "api", "graphql",
                 "-f", "query=query(\$o:String!,\$r:String!){repository(owner:\$o,name:\$r){releases(first:1,orderBy:{field:CREATED_AT,direction:DESC}){nodes{tagName publishedAt}}}}",
                 "-f", f"o={org_key}", "-f", f"r={r['name']}"],
                stderr=subprocess.DEVNULL,
            )
            j = json.loads(raw)
            nodes = j.get("data", {}).get("repository", {}).get("releases", {}).get("nodes", [])
            if nodes:
                data["releases"][key] = {
                    "latest_tag": nodes[0]["tagName"],
                    "published_at": nodes[0]["publishedAt"],
                    "pin": r.get("pin", "latest"),
                    "checked_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                }
        except Exception:
            pass
data["updated_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
with open(hashes_path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print("[graphql-deps] upstream-hashes.json updated (releases block)")
PY
