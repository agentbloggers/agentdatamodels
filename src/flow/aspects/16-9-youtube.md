# Aspect — 16:9 for YouTube

## Target

- **Ratio:** 16:9
- **Resolution:** 1920×1080 (Veo 3.1 Fast default)
- **Duration:** 8 seconds
- **Upload target:** YouTube Shorts (yes — 16:9 is allowed on Shorts
  via letterboxing; we pair each 16:9 with a 9:16 for formal Shorts
  placement)
- **Primary placement:** YouTube Shorts **description card** or the
  regular YouTube feed as short-form content

## Framing notes (appended to Veo prompt)

```
FRAMING: 16:9 landscape. Subject fills the center-right third. Negative
space on the LEFT for lower-third text overlay in post. Windshield
and driver's side frame visible at far right. Blurred city skyline
through the rear side window on the left of frame.
```

## Why the left-side negative space

Post-production adds text overlays (delta summary, CLI version, URL
callout) on the left third of the frame. Keeping Gemmah center-right
prevents overlap.

## Common 16:9 failure modes

- Veo center-composing Gemmah — reject if she's dead-center
- Steering wheel intruding into the bottom-left of frame
- Over-wide framing that turns the car interior into a still life —
  she must fill vertical space comfortably

## Model selection

- `veo-3.1-fast-generate-preview` via Gemini API (20 credits non-Ultra)
- Extend / Insert / Remove not used for short-form — if the first
  generation fails rubric, we regenerate from scratch rather than
  edit

## Source

- `https://support.google.com/flow/answer/16352836` — models support
  text-to-video, frames-to-video, 16:9 landscape
- `https://ai.google.dev/gemini-api/docs/video` — Gemini API Veo
  access for programmatic generation
