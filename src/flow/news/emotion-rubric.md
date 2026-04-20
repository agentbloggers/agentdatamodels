# Emotion rubric — scoring a CHANGELOG delta for virality

After `flow-fetch-news.sh` produces the per-source delta,
`flow-score-news.sh` asks **Opus 4.6** (the CODE stage of the CEE
chain — see `src/flow/README.md`) to score **each new bullet**
against this rubric and return the top-scoring one plus a winning
emotion class. Invocation shape:

```bash
claude -p --bare "$PROMPT" \
  --model claude-opus-4-6 \
  --output-format json \
  --json-schema "$SCHEMA"
```

The `--model` flag is non-negotiable: without it, the wrapping
session's default model propagates, and `flow-run` outputs stop being
reproducible across local / cloud / Routine contexts.

## Emotion classes (pick exactly one)

| Class | When it fits |
|---|---|
| **awe** | Genuinely new capability — "this unlocks a thing that wasn't possible yesterday" |
| **surprise** | Unannounced / unexpected — "nobody saw this coming" |
| **FOMO** | Social-pressure angle — "if you're not on this, you're behind" |
| **frustration** | Breaking change / deprecation / regression — "this is going to hurt" |
| **insider** | Obscure flag / niche feature — "only power users will notice this" |

## Score dimensions (0.0–1.0 each)

| Dimension | Description |
|---|---|
| `novelty` | Is this a genuinely new thing, or a polish update? Polish scores low. |
| `concreteness` | Can you name a specific flag, command, endpoint, or behavior change? |
| `reaction_surface` | Does it provoke a feelable reaction (awe/dread/etc.), or is it neutral plumbing? |
| `screenshot_value` | Would a viewer pause and screenshot the spoken name? |

**Overall `emotion_score` = mean of the four dimensions.** A delta
must score ≥ 0.60 overall to qualify for a video. Below 0.60, we
skip generation and wait for a better delta.

## Json-schema for the scoring call

The `claude -p --bare` call uses this schema (fed to `--json-schema`):

```json
{
  "type": "object",
  "required": ["winner"],
  "properties": {
    "winner": {
      "type": "object",
      "required": ["delta_summary", "source_url", "emotion", "score", "dimensions"],
      "properties": {
        "delta_summary": { "type": "string", "maxLength": 200 },
        "source_url":    { "type": "string" },
        "emotion": {
          "type": "string",
          "enum": ["awe", "surprise", "FOMO", "frustration", "insider"]
        },
        "score":      { "type": "number", "minimum": 0, "maximum": 1 },
        "dimensions": {
          "type": "object",
          "required": ["novelty", "concreteness", "reaction_surface", "screenshot_value"],
          "properties": {
            "novelty":          { "type": "number" },
            "concreteness":     { "type": "number" },
            "reaction_surface": { "type": "number" },
            "screenshot_value": { "type": "number" }
          }
        }
      }
    },
    "runners_up": {
      "type": "array",
      "items": { "$ref": "#/properties/winner" }
    }
  }
}
```

## How the winner feeds the spec

The winning `{delta_summary, emotion}` is stitched by
`flow-score-news.sh` into a draft spec at
`src/flow/pipelines/specs/<date>-<slug>.draft.json` that the author
reviews, renames to `.json`, and hands to `flow-generate.sh`. Shape:

```json
{
  "news": {
    "source_url": "...",
    "delta_summary": "...",
    "emotional_beat": "awe",
    "emotion_score": 0.82
  },
  "hook": "<picked from hooks/viral-patterns.md for the matching class>"
}
```

## Why we score before generating

Every Veo 3.1 Fast run costs 20 credits (or 10 on Ultra) × 2 aspects
= 40 credits per shipped video. Regenerations on continuity failure
can 3× that. Filtering out weak deltas upstream saves credits and
prevents "nothing-happened" videos that tank retention.

## Source

Internal rubric — not upstream. Tune dimensions based on engagement
data once we have a month of posted videos to compare.
