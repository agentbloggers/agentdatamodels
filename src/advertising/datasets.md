# Datasets — public bidding & CTR benchmarks

All are too large to vendor. Linked only. Pull on-demand via the
HuggingFace `datasets` library or the dataset home page.

## HuggingFace-hosted

| Dataset | URL | Size | License |
|---|---|---|---|
| `criteo/CriteoPrivateAd` | https://huggingface.co/datasets/criteo/CriteoPrivateAd | **34 GB** (100M samples, Parquet) | CC-BY-SA 4.0 |
| Criteo 1TB Click Logs | https://huggingface.co/datasets/criteo/CriteoClickLogs | ~1 TB | Criteo research license |
| Avazu CTR | https://www.kaggle.com/c/avazu-ctr-prediction — HF mirrors exist | ~1 GB | Kaggle terms |
| iPinYou | https://www.kaggle.com/datasets/lastsummer/ipinyou — HF mirrors exist | ~35 GB (all seasons) | Academic use |

## HuggingFace paper / model feeds

- **CTR papers on HF** — https://huggingface.co/papers?q=click-through
  Running filtered feed. DIN, SDIM, AdSEE, FGCNN, etc.
- **Ad-auction papers** — HF paper 2306.01799 (Pairwise Ranking Losses
  for Welfare Maximization in Ad Auctions) is mirrored locally at
  `papers/arxiv/2306.01799.pdf`.
- **WWW 2025 EReL@MIR Multimodal CTR Challenge** — winning-solution
  checkpoints on HF. Search "EReL MIR CTR" on the Hub.

## Load examples

```python
# CriteoPrivateAd — streaming to avoid the 34 GB download
from datasets import load_dataset
ds = load_dataset("criteo/CriteoPrivateAd", streaming=True)
for row in ds["train"].take(10):
    print(row)
```

```python
# Avazu — classic CTR benchmark
import pandas as pd
df = pd.read_csv("train.gz", compression="gzip", nrows=1_000_000)
```

## Why not vendored

- 34 GB – 1 TB per dataset.
- Licenses require attribution on distribution — simpler to link.
- Datasets get refreshed upstream; pinning a local snapshot rots fast.

## How to pin a reproducible experiment

If a specific revision matters for a paper reproduction, pin the HF
revision SHA:

```python
load_dataset("criteo/CriteoPrivateAd", revision="<sha>")
```

Record the SHA in the caller's experiment manifest, not here.
