#!/usr/bin/env bash
# flow-evaluate.sh — EVALUATE stage of the CEE loop.
#
# Given a spec that has been populated with outputs[] (by flow-generate.sh),
# spawn the `gemmah-director` subagent to score each uploaded mp4 against
# src/flow/evaluate/rubric.md. Write a verdict JSON beside the spec.
#
# On fail + retries remaining, invoke flow-generate.sh again with a
# targeted prompt patch. Max 3 retries per aspect.
#
# Usage: bash .claude/scripts/flow-evaluate.sh <spec-path>

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

SPEC="${1:-}"
[ -n "$SPEC" ] || { echo "usage: $0 <spec-path>" >&2; exit 2; }
[ -f "$SPEC" ] || { echo "spec not found: $SPEC" >&2; exit 2; }

log()  { printf "[flow-evaluate] %s\n" "$*"; }
fail() { printf "[flow-evaluate] ERROR: %s\n" "$*" >&2; exit 1; }

command -v jq     >/dev/null 2>&1 || fail "jq required"
command -v claude >/dev/null 2>&1 || fail "claude CLI required"

# Spec must have outputs[] populated.
outputs_count=$(jq '.outputs | length' "$SPEC")
[ "$outputs_count" -gt 0 ] || fail "spec has no outputs[] — run flow-generate.sh first"

VERDICT_PATH="${SPEC%.json}.verdict.json"

# Delegate to the gemmah-director subagent. It:
#   - Reads src/flow/evaluate/rubric.md
#   - Reads each output's drive_file_id via the Drive MCP
#   - Returns the verdict JSON shape described in the rubric
PROMPT="You are gemmah-director. Evaluate the spec at \`$SPEC\` against the rubric at \`src/flow/evaluate/rubric.md\`. For each entry in the spec's outputs[], fetch the mp4 by drive_file_id via the Drive MCP, sample 8 frames (t=0,1,2,3,4,5,6,7s) plus the full audio, and score every rubric check. Return the verdict JSON exactly as specified in the rubric. No prose."

log "delegating to gemmah-director subagent"
VERDICT=$(claude -p --bare "$PROMPT" \
  --output-format json \
  --agent gemmah-director \
  | jq '.structured_output // .result // empty')

[ -n "$VERDICT" ] && [ "$VERDICT" != "null" ] || fail "subagent returned no verdict"

echo "$VERDICT" | jq '.' > "$VERDICT_PATH"
log "wrote verdict: $VERDICT_PATH"

TOP=$(jq -r '.verdict' "$VERDICT_PATH")
log "top-level verdict: $TOP"

case "$TOP" in
  pass)
    log "PASS — both aspects cleared rubric. Ship."
    exit 0
    ;;
  partial_pass|fail)
    FAILING_ASPECTS=$(jq -r '.aspects | to_entries[] | select(.value.overall=="fail") | .key' "$VERDICT_PATH")
    for aspect in $FAILING_ASPECTS; do
      retries_used=$(jq -r --arg a "$aspect" '[.outputs[] | select(.aspect==$a) | .retries_used // 0] | first // 0' "$SPEC")
      if [ "$retries_used" -ge 3 ]; then
        log "[$aspect] retry budget exhausted (3/3). Marking needs_human_review."
        jq '.verdict = "needs_human_review"' "$VERDICT_PATH" > "${VERDICT_PATH}.tmp" \
          && mv "${VERDICT_PATH}.tmp" "$VERDICT_PATH"
        exit 3
      fi
      new_retries=$((retries_used + 1))
      log "[$aspect] regenerating (retry $new_retries/3)"

      # retry.json: same spec, restricted to the one failing aspect, with its
      # previous output dropped so flow-generate.sh re-populates it cleanly.
      jq --arg a "$aspect" '
        .outputs = [.outputs[] | select(.aspect != $a)] |
        .aspects = [$a]
      ' "$SPEC" > "${SPEC}.retry.json"

      bash .claude/scripts/flow-generate.sh "${SPEC}.retry.json"

      # Replace (not append) the failing aspect's output with the regenerated
      # one, and stamp the incremented retries_used on it.
      jq --slurpfile r "${SPEC}.retry.json" --arg a "$aspect" --argjson n "$new_retries" '
        .outputs = (
          [.outputs[] | select(.aspect != $a)] +
          ($r[0].outputs | map(.retries_used = $n))
        )
      ' "$SPEC" > "${SPEC}.tmp" && mv "${SPEC}.tmp" "$SPEC"
      rm -f "${SPEC}.retry.json"
    done
    log "re-evaluating after retries"
    exec bash .claude/scripts/flow-evaluate.sh "$SPEC"
    ;;
  needs_human_review)
    log "needs_human_review — stop. Inspect $VERDICT_PATH."
    exit 3
    ;;
  *)
    fail "unknown verdict: $TOP"
    ;;
esac
