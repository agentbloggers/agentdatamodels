#!/usr/bin/env bash
# flow-score-news.sh — CODE stage (Opus 4.6) of the CEE chain.
#
# Reads the most recent .claude/graphql-runs/flow-news-*.json, asks
# Opus 4.6 to score every new CHANGELOG bullet against
# src/flow/news/emotion-rubric.md, and emits a draft video spec to
# src/flow/pipelines/specs/<date>-<slug>.draft.json.
#
# The draft is a spec.schema.json-shaped starting point for the
# human author — they rename to .json (dropping .draft), tweak the
# hook / location / beat sheet, then feed it to flow-generate.sh.
#
# Chain position: this is the first Claude call in the pipeline.
# Everything upstream (flow-fetch-news.sh) is pure curl + python;
# everything downstream that reaches Claude pins a specific Opus
# model — 4.6 for CODE, 4.7 for EVALUATE.
#
# Usage:
#   bash .claude/scripts/flow-score-news.sh                # newest run
#   bash .claude/scripts/flow-score-news.sh <run.json>     # specific run

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

log()  { printf "[flow-score-news] %s\n" "$*" >&2; }
fail() { printf "[flow-score-news] ERROR: %s\n" "$*" >&2; exit 1; }

command -v jq     >/dev/null 2>&1 || fail "jq required"
command -v claude >/dev/null 2>&1 || fail "claude CLI required"

RUN="${1:-}"
if [ -z "$RUN" ]; then
  RUN="$(ls -1 .claude/graphql-runs/flow-news-*.json 2>/dev/null | sort | tail -n1 || true)"
  [ -n "$RUN" ] || fail "no flow-news-*.json runs found — run 'make flow-news' first"
fi
[ -f "$RUN" ] || fail "run file not found: $RUN"

log "scoring deltas from $RUN with Opus 4.6"

RUBRIC="src/flow/news/emotion-rubric.md"
HOOKS="src/flow/hooks/viral-patterns.md"
[ -f "$RUBRIC" ] || fail "missing $RUBRIC"
[ -f "$HOOKS" ]  || fail "missing $HOOKS"

# Build the scoring prompt. Opus 4.6 gets the rubric, the hook
# patterns, and the full delta payload — returns strict JSON per
# spec.schema.json's news{} + hook fields.
PROMPT="You are scoring CHANGELOG deltas for short-form virality per the rubric at \`$RUBRIC\` and the hook patterns at \`$HOOKS\`.

Read the delta JSON below. For each new line across every source, score against the rubric (novelty, concreteness, reaction_surface, screenshot_value). Pick the single winner with emotion_score >= 0.60. If no delta clears 0.60, return {\"winner\": null, \"reason\": \"no qualifying delta\"}.

On a winner: compose a spec-ready fragment with:
- news.source_url, news.delta_summary (<=200 chars), news.emotional_beat, news.emotion_score
- hook (verbatim first-2-seconds line, picked from hooks/viral-patterns.md for the matching emotion class)
- beat_sheet: 3 entries covering 0.0-2.0 / 2.0-6.0 / 6.0-8.0

Return strict JSON only; no prose.

DELTA RUN:
$(cat "$RUN")"

SCHEMA='{
  "type": "object",
  "oneOf": [
    {
      "type": "object",
      "required": ["winner"],
      "properties": {
        "winner": { "type": "null" },
        "reason": { "type": "string" }
      }
    },
    {
      "type": "object",
      "required": ["winner"],
      "properties": {
        "winner": {
          "type": "object",
          "required": ["news", "hook", "beat_sheet"],
          "properties": {
            "news": {
              "type": "object",
              "required": ["source_url", "delta_summary", "emotional_beat", "emotion_score"],
              "properties": {
                "source_url":     { "type": "string" },
                "delta_summary":  { "type": "string", "maxLength": 200 },
                "emotional_beat": { "type": "string", "enum": ["awe","surprise","FOMO","frustration","insider"] },
                "emotion_score":  { "type": "number", "minimum": 0, "maximum": 1 }
              }
            },
            "hook": { "type": "string", "maxLength": 120 },
            "beat_sheet": {
              "type": "array",
              "minItems": 3,
              "maxItems": 3,
              "items": {
                "type": "object",
                "required": ["t","desc"],
                "properties": {
                  "t":    { "type": "string" },
                  "desc": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  ]
}'

RESULT=$(claude -p --bare "$PROMPT" \
  --model claude-opus-4-6 \
  --output-format json \
  --json-schema "$SCHEMA" \
  | jq '.structured_output')

WINNER=$(echo "$RESULT" | jq -r '.winner // empty')
if [ -z "$WINNER" ] || [ "$WINNER" = "null" ]; then
  reason=$(echo "$RESULT" | jq -r '.reason // "no qualifying delta"')
  log "no winner: $reason"
  exit 4
fi

# Stitch the Opus-4.6 fragment onto a spec skeleton. Location is
# 'car-night' by default for today's videos; author swaps to a
# different src/flow/locations/*.md file as needed.
DATE=$(date -u +%Y-%m-%d)
SLUG=$(echo "$WINNER" | jq -r '.news.delta_summary' \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g' \
  | cut -c1-40)
OUT="src/flow/pipelines/specs/${DATE}-${SLUG}.draft.json"
mkdir -p src/flow/pipelines/specs

jq --argjson w "$WINNER" --arg date "$DATE" '
  {
    date:             $date,
    character:        "gemmah",
    location:         "car-night",
    duration_seconds: 8,
    aspects:          ["16:9", "9:16"],
    news:             $w.news,
    hook:             $w.hook,
    beat_sheet:       $w.beat_sheet,
    veo_model:        "veo-3.1-fast-generate-preview",
    image_model:      "nano-banana-pro",
    reference_frames: ["src/flow/ingredients/gemmah-portrait-neutral.png"],
    outputs:          []
  }
' <<< 'null' > "$OUT"

log "wrote draft spec: $OUT"
log "review + rename to .json, then: make flow-run SPEC=$OUT"
