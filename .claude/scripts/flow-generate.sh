#!/usr/bin/env bash
# flow-generate.sh — CODE + EXECUTE stages of the CEE loop.
#
# Given a populated spec JSON:
#   1. Validate it against src/flow/pipelines/spec.schema.json.
#   2. Compose the full Veo prompt (character + location + beat sheet
#      + aspect framing) from the docs under src/flow/.
#   3. If the reference portrait ingredient is missing, generate it
#      via Nano Banana (Gemini API — `imagen` / nano-banana endpoint).
#   4. Dispatch two Veo 3.1 Fast jobs in parallel (one per aspect).
#   5. Poll until complete, download mp4s to src/flow/out/<date>/.
#   6. Upload each mp4 to Google Drive via a claude -p --bare call
#      that uses the Drive MCP. Record drive_file_id in the spec's
#      outputs[] array.
#
# Requires:
#   - GEMINI_API_KEY         (for Veo + Nano Banana)
#   - GOOGLE_DRIVE_FOLDER_ID (Drive upload destination)
#   - claude CLI on PATH
#   - curl, jq, python3
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
command -v claude  >/dev/null 2>&1 || fail "claude CLI required on PATH"

: "${GEMINI_API_KEY:?GEMINI_API_KEY not set}"
: "${GOOGLE_DRIVE_FOLDER_ID:?GOOGLE_DRIVE_FOLDER_ID not set}"

# -----------------------------------------------------------------
# 1. Validate spec against schema
# -----------------------------------------------------------------
log "validating spec against schema"
python3 - <<PY
import json, sys
try:
    import jsonschema
except ImportError:
    print("note: jsonschema not installed — skipping structural validation")
    sys.exit(0)
schema = json.load(open("src/flow/pipelines/spec.schema.json"))
spec   = json.load(open("$SPEC"))
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

PROMPT_BASE="$(python3 - <<PY
spec = __import__("json").load(open("$SPEC"))
char = open("$CHAR_BRIEF").read()
loc  = open("$LOC_BRIEF").read()
beats = "\n".join(f"  {b['t']}: {b['desc']}" for b in spec["beat_sheet"])
print(f"""SUBJECT (from character brief — do not paraphrase):
{char}

SETTING (from location brief):
{loc}

HOOK (spoken verbatim in 0.0-2.0):
{spec['hook']}

BEAT SHEET:
{beats}

NEWS CONTEXT (informs body 2.0-6.0, do NOT read verbatim):
{spec['news']['delta_summary']}

REJECT: AI-smoothed skin, extra fingers, doubled seatbelts, visible readable text on any screen, opening pan-in, eye contact arriving after t=0.5s.
""")
PY
)"

# -----------------------------------------------------------------
# 3. Ensure the Nano Banana reference portrait exists
# -----------------------------------------------------------------
ING_DIR="src/flow/ingredients"
mkdir -p "$ING_DIR"
PORTRAIT="$ING_DIR/gemmah-portrait-neutral.png"

if [ ! -f "$PORTRAIT" ]; then
  log "generating reference portrait via Nano Banana ($IMAGE_MODEL)"
  # Nano Banana endpoint (Gemini API image generation)
  # Endpoint shape per ai.google.dev/gemini-api/docs/image-generation
  PORTRAIT_PROMPT="Portrait photograph of a 22-year-old Australian-American woman named Gemmah. Long wavy hair, center-parted. Two-tone: dark brunette on viewer's LEFT half, platinum silver on viewer's RIGHT half. Warm olive skin, full neutral-mauve lips, softly arched deep-brown brows, expressive brown eyes. Small gold hoop earrings. Oversized black hoodie. Soft natural studio light, matte skin, no smoothing. Head-and-shoulders framing, eyes to camera."

  payload=$(jq -n --arg p "$PORTRAIT_PROMPT" --arg model "$IMAGE_MODEL" \
    '{contents:[{parts:[{text:$p}]}], model:$model}')
  # NOTE: exact endpoint path updated per current Gemini API docs.
  # See src/flow/README.md "Source" section for references.
  resp=$(curl -sfL -X POST \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    --data "$payload" \
    "https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent") \
    || fail "Nano Banana call failed"
  # Extract inline_data.data (base64) from the response and decode.
  echo "$resp" | jq -r '.candidates[0].content.parts[] | select(.inline_data) | .inline_data.data' \
    | base64 -d > "$PORTRAIT" \
    || fail "failed to decode Nano Banana response"
  log "wrote $PORTRAIT ($(stat -c%s "$PORTRAIT" 2>/dev/null || stat -f%z "$PORTRAIT") bytes)"
else
  log "reference portrait cached: $PORTRAIT"
fi

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

  # Read reference portrait as base64 for the Veo "image" / ingredients input.
  local portrait_b64; portrait_b64=$(base64 -w0 "$PORTRAIT" 2>/dev/null || base64 "$PORTRAIT")

  local payload
  payload=$(jq -n \
    --arg p "$full_prompt" \
    --arg aspect "$aspect" \
    --arg portrait "$portrait_b64" \
    '{
       instances: [
         {
           prompt: $p,
           image: { bytesBase64Encoded: $portrait, mimeType: "image/png" }
         }
       ],
       parameters: {
         aspectRatio:  $aspect,
         durationSeconds: 8,
         personGeneration: "allow_adult"
       }
     }')

  log "[$aspect] dispatching Veo ($VEO_MODEL)"
  local start_resp
  start_resp=$(curl -sfL -X POST \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: $GEMINI_API_KEY" \
    --data "$payload" \
    "https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL}:predictLongRunning") \
    || fail "[$aspect] Veo dispatch failed"

  local op_name; op_name=$(echo "$start_resp" | jq -r '.name')
  log "[$aspect] operation: $op_name"

  # Poll for completion.
  local done="false"
  local attempt=0
  local poll_resp
  while [ "$done" != "true" ] && [ $attempt -lt 60 ]; do
    sleep 10
    attempt=$((attempt+1))
    poll_resp=$(curl -sfL \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      "https://generativelanguage.googleapis.com/v1beta/${op_name}") \
      || fail "[$aspect] Veo poll failed at attempt $attempt"
    done=$(echo "$poll_resp" | jq -r '.done // false')
    log "[$aspect] poll $attempt: done=$done"
  done
  [ "$done" = "true" ] || fail "[$aspect] Veo did not complete in 10 minutes"

  # Download the resulting video URI.
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
# 5. Upload each mp4 to Drive via a claude -p --bare delegation.
#    The Drive MCP server is registered in .mcp.json; the subagent
#    has tool-allow for mcp__7806def9-...__create_file.
# -----------------------------------------------------------------
log "uploading outputs to Google Drive (folder $GOOGLE_DRIVE_FOLDER_ID)"

UPLOAD_JSON=$(python3 - <<PY
import json
out = {a: p for a, p in [$(for a in "${!MP4S[@]}"; do printf '("%s","%s"),' "$a" "${MP4S[$a]}"; done)][:]}
print(json.dumps(out))
PY
)

UPLOAD_PROMPT="Upload each mp4 path below to Google Drive folder id \`$GOOGLE_DRIVE_FOLDER_ID\` using the Drive MCP's create_file tool. Return a JSON object mapping aspect -> drive_file_id. No prose.

Paths by aspect:
$UPLOAD_JSON"

# CODE stage of the CEE chain: Opus 4.6 handles all "authoring +
# tool-dispatch" Claude calls. EVALUATE stage (flow-evaluate.sh) is
# pinned to Opus 4.7 for the vision rubric.
UPLOAD_RESULT=$(claude -p --bare "$UPLOAD_PROMPT" \
  --model claude-opus-4-6 \
  --output-format json \
  --json-schema '{"type":"object","patternProperties":{"^(16:9|9:16)$":{"type":"string"}},"additionalProperties":false}' \
  | jq '.structured_output')

log "drive upload result: $UPLOAD_RESULT"

# -----------------------------------------------------------------
# 6. Patch the spec with outputs[].
# -----------------------------------------------------------------
python3 - <<PY
import json
spec = json.load(open("$SPEC"))
uploads = $UPLOAD_RESULT
from datetime import datetime, timezone
now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
new_outputs = []
for aspect, drive_id in uploads.items():
    new_outputs.append({
        "aspect": aspect,
        "drive_file_id": drive_id,
        "generated_at": now,
    })
# flow-evaluate.sh is the sole writer of retries_used; don't reset it here.
spec["outputs"] = new_outputs
open("$SPEC", "w").write(json.dumps(spec, indent=2) + "\n")
PY

log "spec updated with outputs[]: $SPEC"
log "done — run flow-evaluate.sh next"
