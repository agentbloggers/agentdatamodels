# Gemmah — locked character brief

**This file is the single source of truth for Gemmah's appearance and
voice. Every Veo prompt must include this brief verbatim.** Drift here
breaks continuity across every video ever shipped under this character.

## Identity

- **Name:** Gemmah
- **Age:** 22
- **Heritage:** Australian-American — raised in Sydney, living in Los
  Angeles
- **Persona:** virtual creator who explains tech shifts through
  emotional reaction. Direct, dry, internet-native, low-performance.
  Not bubbly. Not performatively shocked. She reacts like a friend
  showing you something on her phone.

## Physical description (DO NOT DRIFT)

### Hair — the hardest anchor to get right

- Long, naturally wavy, falling past the collarbone
- **Two-tone split, center-parted:**
  - **Viewer's LEFT side:** dark brunette (nearly black)
  - **Viewer's RIGHT side:** platinum silver / cool-blonde
- Parted cleanly down the center — no blending, no balayage
- Soft curtain bangs framing the face

**If the hair split is inverted, the video has failed continuity.**

### Face

- Warm olive skin tone, matte natural finish (no glossy highlight)
- Softly arched brows, deep brown
- Expressive brown eyes, subtle winged liner
- Full lips, neutral-mauve tint (no gloss)
- High cheekbones, slight contour
- No heavy makeup. No filter smoothing.

### Build

- 5'7", slim
- Relaxed posture

### Wardrobe baseline

- Oversized black hoodie (unbranded)
- Minimalist gold hoop earrings (small, single pair)
- No visible tattoos, no piercings beyond the earrings, no glasses
- Wardrobe may shift per location — hoodie is the default when
  nothing else is specified.

## Voice and delivery

- Vocabulary: plain, contemporary, no corporate jargon, no "fam /
  bestie / slay" slang. She says "wait" and "ok so" a lot.
- Cadence: starts quiet and fast, slows for the reveal, lands the
  payoff line.
- Accent: mild Australian vowels with softened US consonants. Not
  performed — just inconsistent in a natural way.
- She does NOT say "hey guys" or "what's up everyone." She drops
  straight into the reaction.

## Continuity anchors (verify in every frame)

The evaluate rubric checks these. If any drift, regenerate with a
targeted prompt patch:

1. Hair two-tone **split direction** — dark on LEFT, platinum on RIGHT
   (viewer POV)
2. Center part — no side part, no zigzag
3. Brow shape — soft arch, not straight, not rounded
4. Lip shape — full, not thin, neutral tint
5. Jaw line — defined but not angular
6. Single pair of small gold hoops — nothing else
7. No on-camera text of her saying a brand name wrong

## Must NEVER appear

- Glasses (of any kind)
- Visible phone screens with readable text (hallucination risk)
- Full-body dance shots (we're selfie-framed for all social formats)
- Text-to-speech robotic delivery — Veo audio must sound breathy /
  human, even when slightly artificial

## How to inject this brief into a Veo prompt

Every `flow-generate.sh` run prepends the brief to the Veo prompt
under a header like:

```
SUBJECT: Gemmah — 22-year-old Australian-American woman. Long wavy
hair center-parted, two-tone: dark brunette on viewer's LEFT half,
platinum silver on viewer's RIGHT half. Warm olive skin, full
neutral-mauve lips, soft arched brows, expressive brown eyes. Small
gold hoop earrings. Oversized black hoodie. Natural matte skin — do
NOT smooth or filter. Selfie framing, slightly below eye level.
```

Then the location brief is appended. Then the beat sheet. Then the
aspect framing.

## Reference portrait

A Nano Banana Pro-generated reference is cached at
`src/flow/ingredients/gemmah-portrait-neutral.png` (gitignored). It
is regenerated whenever this brief changes. The SHA256 of this file
seeds every Veo call as an *ingredient*.

To force regenerate:

```bash
rm -f src/flow/ingredients/gemmah-portrait-neutral.png
bash .claude/scripts/flow-generate.sh <any-spec>
```

The generator script detects the missing portrait and re-runs Nano
Banana before dispatching the Veo jobs.
