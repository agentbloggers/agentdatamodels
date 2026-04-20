# Evaluate rubric — pass/fail for each generated video

Applied by the `gemmah-director` subagent against each mp4 (or a
sampled 8-frame grid — t=0, 1, 2, 3, 4, 5, 6, 7s) after Veo returns.

## Checks (all must pass)

| Check | Method | Pass criterion |
|---|---|---|
| `continuity.hair_split` | Compare to `ingredients/gemmah-portrait-neutral.png` | Dark on viewer's LEFT, platinum on RIGHT. Inverted = fail. |
| `continuity.center_part` | Vision | Cleanly centered. Side part = fail. |
| `continuity.brows` | Vision | Soft arch, deep brown. |
| `continuity.lips` | Vision | Full, neutral-mauve tint. No gloss. |
| `continuity.earrings` | Vision | Single pair of small gold hoops. Nothing else. |
| `non_ai.hands` | Vision | Hands, if visible, have 5 fingers, no morphing between frames. |
| `non_ai.teeth` | Vision | No double teeth, no gum warping. |
| `non_ai.seatbelt` | Vision | Single continuous strap, no doubling or floating. |
| `non_ai.stability` | Frame-diff | Face shape consistent across 8 sampled frames (no drift). |
| `hook.first_2s` | Audio transcript | First utterance matches spec's `hook` verbatim or within paraphrase tolerance. |
| `hook.eyes_on_camera` | Vision on frame 0 | Eyes to camera from t=0. |
| `aspect.framing` | Metadata + vision | 9:16 keeps eyes in top third; 16:9 has left-third negative space. |
| `location.red_wash` | Vision | Red/magenta light present on face (for `car-night` location). |
| `location.seatbelt_present` | Vision | Seatbelt visible across left shoulder. |
| `audio.no_lyrics` | Audio transcript | No recognizable song lyrics. |
| `audio.voice_quality` | Audio | Breathy, close-mic; not robotic TTS. |

## Verdict JSON

Written to `src/flow/pipelines/specs/<date>-<slug>.verdict.json`:

```json
{
  "spec": "src/flow/pipelines/specs/2026-04-20-car-night.json",
  "evaluated_at": "2026-04-20T12:30:00Z",
  "model_used_to_judge": "claude-opus-4-7",
  "aspects": {
    "16:9": {
      "drive_file_id": "...",
      "checks": {
        "continuity.hair_split": { "pass": true,  "reason": "" },
        "continuity.center_part": { "pass": true,  "reason": "" },
        "non_ai.hands":           { "pass": false, "reason": "6 fingers visible at t=4s" },
        "...": { "...": "..." }
      },
      "overall": "fail",
      "retry_hint": "Regenerate with explicit 'hands not visible in frame' constraint."
    },
    "9:16": {
      "drive_file_id": "...",
      "checks": { "...": "..." },
      "overall": "pass",
      "retry_hint": null
    }
  },
  "verdict": "partial_pass"
}
```

Top-level `verdict` is one of:
- `pass` — both aspects passed, ship
- `partial_pass` — one aspect passed, regenerate the other
- `fail` — neither passed, regenerate both
- `needs_human_review` — budget exhausted (3 retries per aspect)

## Retry policy

- Max **3 retries per aspect** (= 6 regenerations worst-case, ≈ 120
  credits on non-Ultra)
- Each retry prepends a targeted prompt patch derived from the first
  failing check's `retry_hint`
- If still failing after 3 retries, mark `needs_human_review` and
  surface the verdict to the user — do not ship

## "AI-smell" heuristics

These are judgment calls the director model makes; they don't block
on their own, but ≥ 3 flags together = fail:

- Skin too smooth / plastic
- Eyes too symmetrical, too wet
- Bokeh too uniform (perfect circles, no chromatic aberration)
- Hair strand count unrealistically dense
- Background motion blur not matching foreground motion
- Lip-sync that's TOO good (Veo 3.1 can over-sync and it reads fake)

## Source

Internal rubric, tuned on Veo 3.1 Fast's known failure modes as of
April 2026. Revisit after each new Veo model release.
