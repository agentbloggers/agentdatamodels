#!/usr/bin/env bash
# Re-fetch every downloadable resource listed in papers/arxiv/manifest.json
# plus the IAB OpenRTB 2.6 spec and the wnzhang/rtb-papers README.
# Writes sha256sums + fetch timestamps to sources.md.
#
# Idempotent: safe to re-run. Existing files are overwritten only on success.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ARXIV_DIR="$ROOT/papers/arxiv"
SPECS_DIR="$ROOT/specs"
SOURCES="$ROOT/sources.md"

UA="Mozilla/5.0 (compatible; agentdatamodels-fetch/1.0)"
FETCH_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

fetch() {
  local url="$1" out="$2"
  local tmp attempt=0 code
  tmp="$(mktemp)"
  while [ $attempt -lt 4 ]; do
    code="$(curl -sSL --max-time 120 -A "$UA" -o "$tmp" -w "%{http_code}" "$url" || echo "000")"
    if [ "$code" = "200" ] && [ -s "$tmp" ]; then
      mv "$tmp" "$out"
      echo "  ok   $out"
      sleep 2
      return 0
    fi
    attempt=$((attempt + 1))
    echo "  retry $attempt ($code) $url" >&2
    sleep $((attempt * 3))
  done
  rm -f "$tmp"
  echo "  FAIL $url" >&2
  return 1
}

: > "$SOURCES"
{
  echo "# Sources — provenance for every file under src/advertising/"
  echo ""
  echo "Regenerate with: \`bash src/advertising/fetch.sh\`"
  echo ""
  echo "Last fetch: $FETCH_DATE"
  echo ""
  echo "| Path | URL | sha256 |"
  echo "|---|---|---|"
} >> "$SOURCES"

record() {
  local path="$1" url="$2"
  local rel="${path#$ROOT/}"
  local sum
  sum="$(sha256sum "$path" | awk '{print $1}')"
  echo "| \`$rel\` | $url | \`$sum\` |" >> "$SOURCES"
}

echo "[fetch.sh] ArXiv PDFs"
python3 - "$ARXIV_DIR/manifest.json" <<'PY' | while IFS=$'\t' read -r id url; do
import json, sys
m = json.load(open(sys.argv[1]))
for p in m["papers"]:
    print(f"{p['id']}\t{p['url']}")
PY
  out="$ARXIV_DIR/${id}.pdf"
  fetch "$url" "$out"
  record "$out" "$url"
done

echo "[fetch.sh] IAB OpenRTB 2.6"
IAB_URL="https://iabtechlab.com/wp-content/uploads/2022/04/OpenRTB-2-6_FINAL.pdf"
IAB_OUT="$SPECS_DIR/openrtb-2-6.pdf"
fetch "$IAB_URL" "$IAB_OUT"
record "$IAB_OUT" "$IAB_URL"

echo "[fetch.sh] wnzhang/rtb-papers README (mirror)"
RTB_URL="https://raw.githubusercontent.com/wnzhang/rtb-papers/master/README.md"
RTB_OUT="$ROOT/papers/rtb-papers-index.md"
TMP="$(mktemp)"
{
  echo "<!--"
  echo "Mirrored from: $RTB_URL"
  echo "Fetched: $FETCH_DATE"
  echo "Upstream: https://github.com/wnzhang/rtb-papers"
  echo "-->"
  echo ""
} > "$TMP"
curl -fsSL --retry 1 -A "$UA" "$RTB_URL" >> "$TMP"
mv "$TMP" "$RTB_OUT"
echo "  ok   $RTB_OUT"
record "$RTB_OUT" "$RTB_URL"

echo ""
echo "[fetch.sh] done — wrote $SOURCES"
