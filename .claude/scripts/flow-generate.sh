#!/usr/bin/env bash
# flow-generate.sh — CODE + EXECUTE stages of the CEE loop.
#
# Given a populated spec JSON:
#   1. Validate it against src/flow/pipelines/spec.schema.json.
#   2. Compose the full Veo prompt (character + location + beat sheet
#      + aspect framing) from the docs under src/flow/.
#   3. If the reference portrait ingredient is missing, generate it
#      via Nano Banana (Gemini API image generation).
#   4. Dispatch two Veo 3.1 jobs in parallel (one per aspect).
#   5. Poll until complete, download mp4s to src/flow/out/<date>/.
#   6. If GOOGLE_DRIVE_FOLDER_ID is set, upload each mp4 to Drive via
#      a claude -p subagent call. Otherwise record local_path in the
#      spec's outputs[] array.
#
# Requires:
#   - GEMINI_API_KEY         (for Veo + Nano Banana)
#   - curl, jq, python3
#   - claude CLI on PATH (only for Drive upload)
#
# Optional env:
#   - GOOGLE_DRIVE_FOLDER_ID  enables Drive upload branch
#   - GEMMAH_FREE_TIER=1      force free-tier model IDs regardless of spec
#
# Usage: bash .claude/scripts/flow-generate.sh <spec-path>

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

SPEC="${1:-}"
[ -n "$SPEC" ] || { echo "usage: $0 <spec-path>" >&2; exit 2; }
[ -f "$SPEC" ] || { echo "spec not found: $SPEC" >&2; exit 2; }

log()  { printf "[flow-generate] %s\n" "$*" >&2; }
fail() { printf "[flow-generate] ERROR: %s\n" "$*" >&2; exit 1; }

command -v curl    >/dev/null 2>&1 || fail "curl required"
command -v jq      >/dev/null 2>&1 || fail "jq required"
command -v python3 >/dev/null 2>&1 || fail "python3 required"

: "${GEMINI_API_KEY:?GEMINI_API_KEY not set}"

DRIVE_ENABLED=0
if [ -n "${GOOGLE_DRIVE_FOLDER_ID:-}" ]; then
  DRIVE_ENABLED=1
  command -v claude >/dev/null 2>&1 || fail "claude CLI required for Drive upload"
fi

# Friendly spec-level names → real Gemini API model IDs. Pass-through
# for values that already look like API IDs. Free defaults cover users
# whose account can't call the Pro preview models.
resolve_image_model() {
  case "${1:-}" in
    nano-banana-pro) echo "gemini-3-pro-image-preview" ;;
    nano-banana-2)   echo "gemini-3.1-flash-image-preview" ;;
    nano-banana|free|"") echo "gemini-2.5-flash-image" ;;
    *) echo "$1" ;;
  esac
}

resolve_veo_model() {
  case "${1:-}" in
    veo-3.1-fast-generate-preview|veo-3.1) echo "veo-3.1-generate-preview" ;;
    veo-3.0-fast|free) echo "veo-3.0-fast-generate-001" ;;
    "") echo "veo-3.1-generate-preview" ;;
    *) echo "$1" ;;
  esac
}

# -----------------------------------------------------------------
# 1. Validate spec against schema
# -----------------------------------------------------------------
log "validating spec against schema"
SPEC_PATH="$SPEC" python3 - <<'PY'
import json, os, sys
try:
    import jsonschema
except ImportError:
    print("note: jsonschema not installed — skipping structural validation")
    sys.exit(0)
schema = json.load(open("src/flow/pipelines/spec.schema.json"))
spec   = json.load(open(os.environ["SPEC_PATH"]))
jsonschema.validate(spec, schema)
print("  ok")
PY

DATE=$(jq -r .date "$SPEC")
CHARACTER=$(jq -r .character "$SPEC")
LOCATION=$(jq -r .location "$SPEC")
VEO_MODEL=$(jq -r .veo_model "$SPEC")
IMAGE_MODEL=$(jq -r .image_model "$SPEC")
HOOK=$(jq -r .hook "$SPEC")
DELTA=$(jq -r .news.delta_summary "$SPEC")

if [ "${GEMMAH_FREE_TIER:-0}" = "1" ]; then
  IMAGE_MODEL_ID="gemini-2.5-flash-image"
  VEO_MODEL_ID="veo-3.0-fast-generate-001"
  log "GEMMAH_FREE_TIER=1 — overriding spec models to free tier"
else
  IMAGE_MODEL_ID="$(resolve_image_model "$IMAGE_MODEL")"
  VEO_MODEL_ID="$(resolve_veo_model "$VEO_MODEL")"
fi
log "image model: $IMAGE_MODEL → $IMAGE_MODEL_ID"
log "veo model:   $VEO_MODEL → $VEO_MODEL_ID"

OUT_DIR="src/flow/out/$DATE"
mkdir -p "$OUT_DIR"

# -----------------------------------------------------------------
# 2. Compose the Veo prompt
# -----------------------------------------------------------------
log "composing Veo prompt for $CHARACTER at $LOCATION"
CHAR_BRIEF="src/flow/character/$CHARACTER.md"
LOC_BRIEF="src/flow/locations/$LOCATION.md"
[ -f "$CHAR_BRIEF" ] || fail "missing character brief: $CHAR_BRIEF"
[ -f "$LOC_BRIEF"  ] || fail "missing location brief: $LOC_BRIEF"

PROMPT_BASE="$(SPEC_PATH="$SPEC" CHAR_PATH="$CHAR_BRIEF" LOC_PATH="$LOC_BRIEF" python3 - <<'PY'
import json, os
spec = json.load(open(os.environ["SPEC_PATH"]))
char = open(os.environ["CHAR_PATH"]).read()
loc  = open(os.environ["LOC_PATH"]).read()
beats = "\n".join(f"  {b['t']}: {b['desc']}" for b in spec["beat_sheet"])
print(
    "SUBJECT (from character brief — do not paraphrase):\n"
    f"{char}\n\n"
    "SETTING (from location brief):\n"
    f"{loc}\n\n"
    "HOOK (spoken verbatim in 0.0-2.0):\n"
    f"{spec['hook']}\n\n"
    "BEAT SHEET:\n"
    f"{beats}\n\n"
    "NEWS CONTEXT (informs body 2.0-6.0, do NOT read verbatim):\n"
    f"{spec['news']['delta_summary']}\n\n"
    "REJECT: AI-smoothed skin, extra fingers, doubled seatbelts, visible "
    "readable text on any screen, opening pan-in, eye contact arriving "
    "after t=0.5s.\n"
)
PY
)"

# -----------------------------------------------------------------
# 3. Ensure the Nano Banana reference portrait exists
# -----------------------------------------------------------------
ING_DIR="src/flow/ingredients"
mkdir -p "$ING_DIR"
PORTRAIT="$ING_DIR/gemmah-portrait-neutral.png"

if [ ! -f "$PORTRAIT" ]; then
  log "generating reference portrait via Nano Banana ($IMAGE_MODEL_ID)"
  PORTRAIT_PROMPT="Portrait photograph of a 22-year-old Australian-American woman named Gemmah. Long wavy hair, center-parted. Two-tone: dark brunette on viewer's LEFT half, platinum silver on viewer's RIGHT half. Warm olive skin, full neutral-mauve lips, softly arched deep-brown brows, expressive brown eyes. Small gold hoop earrings. Oversized black hoodie. Soft natural studio light, matte skin, no smoothing. Head-and-shoulders framing, eyes to camera."

  # 1:1 portrait reads cleanly into both 16:9 and 9:16 Veo jobs.
  payload=$(jq -n --arg p "$PORTRAIT_PROMPT" '{
    contents: [{ parts: [{ text: $p }] }],
    generationConfig: { imageConfig: { aspectRatio: "1:1" } }
  }')

  resp=$(curl -sfL -X POST \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    --data "$payload" \
    "https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL_ID}:generateContent") \
    || fail "Nano Banana call failed (model $IMAGE_MODEL_ID)"

  # REST v1beta returns camelCase inlineData; tolerate snake_case too.
  echo "$resp" | jq -r '
    .candidates[0].content.parts[]
    | (.inlineData // .inline_data)
    | select(. != null)
    | .data' \
    | base64 -d > "$PORTRAIT" \
    || fail "failed to decode Nano Banana response"
  [ -s "$PORTRAIT" ] || fail "Nano Banana returned empty image — check model access + quota"
  log "wrote $PORTRAIT ($(wc -c < "$PORTRAIT") bytes)"
else
  log "reference portrait cached: $PORTRAIT"
fi

# Portable base64 (GNU -w0 vs BSD line-wrapping).
PORTRAIT_B64=$(base64 < "$PORTRAIT" | tr -d '\n')

# -----------------------------------------------------------------
# 4. Dispatch Veo jobs — one per aspect, in parallel
# -----------------------------------------------------------------
ASPECTS=$(jq -r '.aspects[]' "$SPEC")

dispatch_veo () {
  local aspect="$1"
  local framing_file=""
  case "$aspect" in
    "16:9")  framing_file="src/flow/aspects/16-9-youtube.md" ;;
    "9:16")  framing_file="src/flow/aspects/9-16-tiktok.md"  ;;
  esac
  local framing; framing="$(cat "$framing_file")"
  local full_prompt; full_prompt="$PROMPT_BASE"$'\n\n'"FRAMING (for $aspect):"$'\n'"$framing"

  # Gemini API Veo image input: instances[].image.inlineData.{mimeType,data}.
  # (Vertex AI uses bytesBase64Encoded — different product, different shape.)
  local payload
  payload=$(jq -n \
    --arg p "$full_prompt" \
    --arg aspect "$aspect" \
    --arg portrait "$PORTRAIT_B64" \
    '{
       instances: [{
         prompt: $p,
         image: { inlineData: { mimeType: "image/png", data: $portrait } }
       }],
       parameters: { aspectRatio: $aspect }
     }')

  log "[$aspect] dispatching Veo ($VEO_MODEL_ID)"
  local start_resp
  start_resp=$(curl -sfL -X POST \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    --data "$payload" \
    "https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL_ID}:predictLongRunning") \
    || fail "[$aspect] Veo dispatch failed"

  local op_name; op_name=$(echo "$start_resp" | jq -r '.name')
  [ -n "$op_name" ] && [ "$op_name" != "null" ] || fail "[$aspect] no operation name returned"
  log "[$aspect] operation: $op_name"

  local done_flag="false"
  local attempt=0
  local poll_resp
  while [ "$done_flag" != "true" ] && [ $attempt -lt 60 ]; do
    sleep 10
    attempt=$((attempt+1))
    poll_resp=$(curl -sfL \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      "https://generativelanguage.googleapis.com/v1beta/${op_name}") \
      || fail "[$aspect] Veo poll failed at attempt $attempt"
    done_flag=$(echo "$poll_resp" | jq -r '.done // false')
    log "[$aspect] poll $attempt: done=$done_flag"
  done
  [ "$done_flag" = "true" ] || fail "[$aspect] Veo did not complete in 10 minutes"

  local video_uri
  video_uri=$(echo "$poll_resp" | jq -r '.response.generateVideoResponse.generatedSamples[0].video.uri // empty')
  [ -n "$video_uri" ] || fail "[$aspect] no video URI in Veo response"

  local out_mp4="$OUT_DIR/gemmah-${DATE}-${aspect/:/-}.mp4"
  curl -sfL -H "x-goog-api-key: $GEMINI_API_KEY" "$video_uri" -o "$out_mp4" \
    || fail "[$aspect] mp4 download failed"
  log "[$aspect] wrote $out_mp4"

  echo "$out_mp4"
}

declare -A MP4S=()
declare -A PIDS=()
result_dir="$(mktemp -d)"
trap 'rm -rf "$result_dir"' EXIT

for aspect in $ASPECTS; do
  safe_aspect="${aspect/:/-}"
  ( dispatch_veo "$aspect" > "$result_dir/$safe_aspect.path" ) &
  PIDS[$aspect]=$!
done

for aspect in "${!PIDS[@]}"; do
  wait "${PIDS[$aspect]}" || fail "[$aspect] dispatch failed"
done

for aspect in $ASPECTS; do
  safe_aspect="${aspect/:/-}"
  MP4S[$aspect]="$(cat "$result_dir/$safe_aspect.path")"
done

# -----------------------------------------------------------------
# 5. Hand outputs off to the spec — Drive upload if configured,
#    otherwise record local paths.
# -----------------------------------------------------------------
if [ "$DRIVE_ENABLED" = "1" ]; then
  log "uploading outputs to Google Drive (folder $GOOGLE_DRIVE_FOLDER_ID)"

  UPLOAD_JSON=$(for a in "${!MP4S[@]}"; do
    jq -n --arg k "$a" --arg v "${MP4S[$a]}" '{($k):$v}'
  done | jq -s 'add')

  UPLOAD_PROMPT="Upload each mp4 path below to Google Drive folder id \`$GOOGLE_DRIVE_FOLDER_ID\` using the Drive MCP's create_file tool. Return a JSON object mapping aspect -> drive_file_id. No prose.

Paths by aspect:
$UPLOAD_JSON"

  # Drop --bare so .mcp.json loads (Drive MCP must be registered there).
  UPLOAD_RESULT=$(claude -p "$UPLOAD_PROMPT" \
    --model claude-opus-4-6 \
    --output-format json \
    --json-schema '{"type":"object","patternProperties":{"^(16:9|9:16)$":{"type":"string"}},"additionalProperties":false}' \
    | jq -c '.structured_output')

  [ -n "$UPLOAD_RESULT" ] && [ "$UPLOAD_RESULT" != "null" ] \
    || fail "Drive upload returned no structured_output — is the Drive MCP registered in .mcp.json?"

  log "drive upload result: $UPLOAD_RESULT"
else
  log "Drive upload disabled (GOOGLE_DRIVE_FOLDER_ID unset) — recording local paths"
  UPLOAD_RESULT=$(for a in "${!MP4S[@]}"; do
    jq -n --arg k "$a" --arg v "${MP4S[$a]}" '{($k):$v}'
  done | jq -sc 'add')
fi

# -----------------------------------------------------------------
# 6. Patch the spec with outputs[].
# -----------------------------------------------------------------
SPEC_PATH="$SPEC" UPLOAD_RESULT="$UPLOAD_RESULT" DRIVE_ENABLED="$DRIVE_ENABLED" python3 - <<'PY'
import json, os
from datetime import datetime, timezone
spec   = json.load(open(os.environ["SPEC_PATH"]))
result = json.loads(os.environ["UPLOAD_RESULT"])
drive  = os.environ["DRIVE_ENABLED"] == "1"
now    = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
# flow-evaluate.sh is the sole writer of retries_used; don't reset it here.
spec["outputs"] = [
    {
        "aspect": aspect,
        **({"drive_file_id": ident} if drive else {"local_path": ident}),
        "generated_at": now,
    }
    for aspect, ident in result.items()
]
open(os.environ["SPEC_PATH"], "w").write(json.dumps(spec, indent=2) + "\n")
PY

log "spec updated with outputs[]: $SPEC"
log "done — run flow-evaluate.sh next"
