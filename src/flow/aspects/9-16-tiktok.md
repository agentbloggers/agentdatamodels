# Aspect — 9:16 for TikTok / Instagram Reels

## Target

- **Ratio:** 9:16
- **Resolution:** 1080×1920 (Veo 3.1 Fast default for portrait)
- **Duration:** 8 seconds
- **Upload targets:** TikTok, Instagram Reels, YouTube Shorts (native)

## Framing notes (appended to Veo prompt)

```
FRAMING: 9:16 portrait, selfie-style. Subject's face in the TOP third
of frame — eyes at ~30% from the top. Shoulders and seatbelt visible.
Empty space in the BOTTOM third of frame for caption overlay in post.
Car headliner above her hair; rear-window bokeh falling down the
sides of the frame.
```

## Why face-in-top-third

TikTok and Reels both burn UI chrome (username, caption, like button)
over the bottom third of the video. Composing Gemmah's face low gets
her covered by thumbs-tapping hotspots and the share icon.

## Common 9:16 failure modes

- Face centered → half of her mouth gets covered by TikTok UI
- Empty headroom above her hair — headliner should cut close
- Horizontal framing that was rotated to portrait (metadata-only
  rotation) — we must generate **native portrait**, not crop

## Veo's frames-to-video and portrait

Per `https://support.google.com/flow/answer/16352836`, Veo 3.1 Fast
supports portrait frames-to-video but **extend is landscape-only**.
We never extend portrait videos — if the 9:16 run fails rubric, we
regenerate.

## Audio for 9:16

TikTok's algorithm favors original audio with a clear human voice in
the first 0.5s. Gemmah's hook must land BEFORE any ambient city audio
comes in. The Veo prompt includes:

```
AUDIO: Gemmah's voice enters at t=0.0, breathy and close-mic'd. City
ambient audio ducks under her voice; no music with lyrics.
```

## Model selection

- `veo-3.1-fast-generate-preview` via Gemini API (20 credits non-Ultra)
- Same as 16:9 — no quality jump for portrait unless this is a hero
  video

## Source

- `https://support.google.com/flow/answer/16352836` — portrait support
- `https://support.google.com/flow/answer/16353334` — aspect ratio
  preferences + voice references (Veo 3.1 Fast)
