# flow

Google Flow (Veo 3.1 + Nano Banana) video pipeline for **Gemmah** —
a recurring virtual creator who reacts to emotionally-charged deltas
in the `claude-code` CLI `CHANGELOG.md`.

Every run produces **two 8-second clips** from one spec:

- **16:9** for YouTube
- **9:16** for TikTok / Instagram Reels

Outputs land in Google Drive via the Drive MCP.

## The CEE (code-execute-evaluate) loop

Two Claude models chain across the loop: **Opus 4.6 for CODE** (fast
authoring + tool dispatch), **Opus 4.7 for EVALUATE** (latest, best
vision judgment). The `--model` flag is passed explicitly on every
`claude -p --bare` call so the wrapping session can't downgrade.

```
  ┌─────────────────────────┐
  │  1. CODE                │  Opus 4.6 — authoring
  │     fetch CHANGELOGs    │   → .claude/scripts/flow-fetch-news.sh (no Claude)
  │     score emotion       │   → flow-score-news.sh + --model claude-opus-4-6
  │     draft spec          │   → src/flow/pipelines/specs/<date>-<slug>.draft.json
  │     (human reviews)     │   → rename .draft.json → .json, tweak as needed
  └─────────────┬───────────┘
                │
  ┌─────────────▼───────────┐
  │  2. EXECUTE             │  Gemini API (no Claude)
  │     Nano Banana Pro     │   → reference portrait if missing
  │     Veo 3.1 Fast x2     │   → 16:9 + 9:16 in parallel
  │     Drive upload        │   → Opus 4.6 delegates to Drive MCP
  └─────────────┬───────────┘
                │
  ┌─────────────▼───────────┐
  │  3. EVALUATE            │  Opus 4.7 — gemmah-director subagent
  │     rubric scoring      │   → continuity / AI-smell / hook / aspect
  │     verdict JSON        │   → <spec>.verdict.json
  └─────────────┬───────────┘
                │ pass                 │ fail (retries < 3)
                ▼                      ▼
         ship to Drive          patch prompt → loop to step 2
```

**Why 4.6 → 4.7 and not 4.7 throughout.** CODE stage is latency-sensitive
(news score + spec draft happens hourly via Routine). EVALUATE stage is
quality-sensitive and infrequent (once per generated video). Opus 4.6
is ≈40% faster at similar prompt sizes; the per-video cost delta of
using 4.7 only at the gate is worth it.

## One-shot run

```bash
export GEMINI_API_KEY=...
export GOOGLE_DRIVE_FOLDER_ID=...
make flow-run SPEC=src/flow/pipelines/specs/2026-04-20-car-night.json
```

Or explicitly (Opus 4.6 calls are marked **[4.6]**; 4.7 calls **[4.7]**):

```bash
bash .claude/scripts/flow-fetch-news.sh                                            # pure curl
bash .claude/scripts/flow-score-news.sh                                            # [4.6] → draft spec
mv src/flow/pipelines/specs/<date>-<slug>.draft.json \
   src/flow/pipelines/specs/<date>-<slug>.json                                     # human review
bash .claude/scripts/flow-generate.sh  src/flow/pipelines/specs/<date>-<slug>.json # [4.6] upload
bash .claude/scripts/flow-evaluate.sh  src/flow/pipelines/specs/<date>-<slug>.json # [4.7] rubric
```

## Files

| File | Purpose |
|---|---|
| `character/gemmah.md` | Locked visual + voice brief. **Never drift.** |
| `locations/*.md` | One file per scene. Today: `car-night.md`. |
| `hooks/viral-patterns.md` | 0-3s pattern-interrupts and beat sheets |
| `news/sources.md` | The two CHANGELOG URLs + fetch cadence |
| `news/emotion-rubric.md` | How Claude scores a delta (awe / FOMO / surprise / frustration) |
| `aspects/16-9-youtube.md` | YouTube framing notes |
| `aspects/9-16-tiktok.md` | TikTok / Reels framing notes |
| `evaluate/rubric.md` | Pass/fail criteria applied post-generation |
| `pipelines/spec.schema.json` | JSON schema for one video spec |
| `pipelines/specs/*.json` | Frozen specs — one per shipped video |

## Why Veo 3.1 Fast (not Quality)

Fast costs 20 credits/video (10 for Ultra); Quality costs 100. Gemmah's
format is "react to a CHANGELOG delta" — iteration speed matters more
than cinematic polish. Upgrade to Quality only for hero videos.

Reference: `https://support.google.com/flow/answer/16526234`.

## Character continuity is the whole game

Veo 3.1 is not deterministic across runs. We enforce continuity three
ways:

1. A **locked character brief** (`character/gemmah.md`) injected into
   every Veo prompt verbatim.
2. A cached **Nano Banana Pro reference portrait** passed as an
   *ingredient* on every Veo call (per
   `https://support.google.com/flow/answer/16353334` — ingredients
   = visual references).
3. A post-generation **continuity check** in the evaluate rubric:
   hair two-tone split direction, lip shape, jawline — compared by
   Claude vision against the cached portrait.

Three-strike loop: if the verdict flags continuity drift, the generator
re-runs with a prompt patch pinning the specific anchor that drifted.

## Source

- `https://support.google.com/flow/answer/16353333` — Get started
- `https://support.google.com/flow/answer/16353334` — Create videos
- `https://support.google.com/flow/answer/16729550` — Nano Banana / images
- `https://support.google.com/flow/answer/16352836` — Models + features
- `https://ai.google.dev/gemini-api/docs/video` — Gemini API Veo access
