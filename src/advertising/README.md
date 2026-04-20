# `src/advertising/` — programmatic advertising reference library

A curated snapshot of the most useful **freely-available** programmatic
advertising literature + pointers to everything else worth reading. Scoped
around RTB, bid shading, CTR/CVR prediction, inventory quality / IVT, and
the OpenRTB signal layer.

Built for a Netflix-adjacent adtech role. Offline-safe: the PDFs in this
folder work inside a cloud session that has no outbound internet.

## Contents

| Path | What |
|---|---|
| `papers/arxiv/` | 14 ArXiv PDFs (surveys + foundational papers), ~28 MB |
| `papers/arxiv/manifest.json` | id → title / authors / year / URL |
| `papers/rtb-papers-index.md` | Mirror of [`wnzhang/rtb-papers`](https://github.com/wnzhang/rtb-papers) README (~300 citations) |
| `specs/openrtb-2-6.pdf` | IAB Tech Lab OpenRTB 2.6 FINAL (90 pages) |
| `specs/*.md` | SupplyChain Object, ads.txt, sellers.json pointers |
| `books.md` | Commercial books — citation + where to buy |
| `blogs.md` | Adtech blogs & newsletters (Tier 1 / Tier 2 / CTV) |
| `packages.md` | Python + npm packages with install / docs URLs |
| `datasets.md` | HuggingFace + public bidding datasets (links only) |
| `sources.md` | Provenance for every downloaded file (URL + sha256) |
| `fetch.sh` | One-shot re-fetch script (idempotent) |

## Download matrix

- **Downloaded & committed.** ArXiv preprints + OpenRTB 2.6 PDF +
  `rtb-papers` README. 14 PDFs, 1 spec PDF, 1 markdown mirror. ~30 MB.
- **Catalog-only** (not downloaded). Commercial books (copyright),
  HuggingFace datasets (CriteoPrivateAd is 34 GB), paywalled blogs,
  Python/npm packages. See the per-category `.md` files.

## Regenerate

```bash
bash src/advertising/fetch.sh
```

`fetch.sh` is idempotent — re-running it overwrites any PDF that successfully
downloads and refreshes `sources.md` with new sha256s + timestamp. Arxiv can
rate-limit; the script retries up to 4 times with exponential backoff.

## Priority reading order (Netflix DSP/signal lens)

1. **`specs/openrtb-2-6.pdf`** — the bid-stream protocol itself. Read
   sections on SupplyChain Object, User, Device.
2. **`papers/arxiv/2408.07685.pdf`** — auto-bidding survey. Best single
   document for modern bidding landscape.
3. **`papers/arxiv/1610.03013.pdf`** — the foundational RTB survey
   (Wang/Zhang/Yuan). Everything else builds on it.
4. **`papers/arxiv/2202.10462.pdf`** — CTR prediction lit review. 85
   pages; skim for architectures.
5. **`papers/arxiv/1706.06978.pdf`** (DIN) + `1703.04247.pdf` (DeepFM)
   + `2008.13535.pdf` (DCN V2) — the production ranking-model trilogy.
6. **`papers/arxiv/2009.09259.pdf`** — bid shading when the world
   flipped to first-price.
7. **`papers/rtb-papers-index.md`** — when you need to go deeper on any
   subtopic, this is the map.

## Non-downloaded resources to pull on-demand

These need live internet. The URLs are verified in `sources.md` /
`datasets.md` / `blogs.md` and will work from a local session:

- **Jounce Media SPO reports** (https://jouncemedia.com) — supply-path
  optimization. Gated behind email signup.
- **MRC Invalid Traffic Detection Guidelines** (https://mediaratingcouncil.org) —
  the fraud-measurement bible.
- **Google Privacy Sandbox / Protected Audience API**
  (https://privacysandbox.google.com) — where bidstream signals are
  heading post-cookies.
- **HuggingFace `criteo/CriteoPrivateAd`** (34 GB) — privacy-preserving
  bidding-signal benchmark.

## Not in scope

- Scraping blog archives (ToS, paywalls, low signal).
- Downloading HuggingFace datasets (too large to vendor).
- Downloading commercial books (copyright).
- Wrapper code around any of the listed Python / npm packages.
