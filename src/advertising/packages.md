# Packages — Python + npm

Install from the official registry when you need them. Not vendored.

## Python — OpenRTB / protocol

| Package | PyPI / Repo | Notes |
|---|---|---|
| `openrtb` | https://pypi.org/project/openrtb/ | Python classes for OpenRTB 2.x bid requests/responses |
| `iab-tcf` | https://pypi.org/project/iab-tcf/ | IAB TCF v2 consent-string parser |
| `py-openrtb` | https://pypi.org/project/py-openrtb/ | Alternative bid-request parser |

## Python — CTR / CVR / bidding models

| Package | PyPI / Repo | Notes |
|---|---|---|
| `deepctr` | https://github.com/shenweichen/DeepCTR | Keras/TF de facto deep-CTR library |
| `deepctr-torch` | https://github.com/shenweichen/DeepCTR-Torch | PyTorch port — DeepFM, DIN, DCN, xDeepFM, AutoInt, … |
| `FuxiCTR` | https://github.com/reczoo/FuxiCTR | Reproducible CTR benchmark; pairs with BARS benchmark |
| `torchrec` | https://github.com/pytorch/torchrec | Meta's large-scale recommender/ranking library |
| `prediction-flow` | https://github.com/GitHub-HongweiZhang/prediction-flow | Modern PyTorch CTR models |
| `mlgb` | https://github.com/weberrr/mlgb | 50+ ranking/matching models (TF + PyTorch) |
| `tensorflow-recommenders` | https://github.com/tensorflow/recommenders | Google's recommenders toolkit |
| `tensorflow-ranking` | https://github.com/tensorflow/ranking | Google's LTR toolkit |

## Python — data / pipelines / experimentation

| Package | PyPI / Repo | Notes |
|---|---|---|
| `apache-airflow` | https://airflow.apache.org | Workflow orchestration |
| `dbt-core` | https://github.com/dbt-labs/dbt-core | SQL transformation framework |
| `great-expectations` | https://github.com/great-expectations/great_expectations | Data quality tests |
| `pyspark` | https://spark.apache.org/docs/latest/api/python/ | Bid-log-scale processing |
| `duckdb` | https://duckdb.org | In-process analytical DB |
| `polars` | https://pola.rs | Rust-backed DataFrame library |
| `causalml` | https://github.com/uber/causalml | Uplift / incrementality modeling |
| `dowhy` | https://github.com/py-why/dowhy | Causal inference DAGs |
| `bayesmark` | https://github.com/uber/bayesmark | Bayesian A/B testing benchmarks |

## npm / TypeScript — header bidding

| Package | Source | Notes |
|---|---|---|
| `prebid.js` | https://github.com/prebid/Prebid.js | Industry-standard header-bidding lib (v10+ ships TS types) |
| `prebid-server` (Go) | https://github.com/prebid/prebid-server | Server-side header bidding |
| `prebid-server-java` | https://github.com/prebid/prebid-server-java | Java variant |
| `react-prebid` | https://www.npmjs.com/package/react-prebid | React wrapper for Prebid.js |

## npm / TypeScript — IAB Tech Lab

| Package | Source | Notes |
|---|---|---|
| `@iabtechlab/consent-string` | https://github.com/InteractiveAdvertisingBureau/Consent-String-SDK-JS | TCF v1 consent encoding/decoding |
| `@iabtechlab/iabtcf-core` | https://github.com/InteractiveAdvertisingBureau/iabtcf-es | TCF v2 core library |
| `@iabtechlab/adcategories` | https://www.npmjs.com/package/@iabtechlab/adcategories | IAB Content Taxonomy |

## npm / TypeScript — video / CTV

| Package | Source | Notes |
|---|---|---|
| `videojs-contrib-ads` | https://github.com/videojs/videojs-contrib-ads | Video.js ad plugin framework |
| `videojs-ima` | https://github.com/googleads/videojs-ima | Google IMA SDK for Video.js |
| `@types/googletag` | https://www.npmjs.com/package/@types/googletag | GPT / GAM type defs |
| `iab-openrtb` | https://www.npmjs.com/package/iab-openrtb | OpenRTB 2.5/2.6/3.0 TS typings |
| `@amp/amp-ad` | https://amp.dev/documentation/components/amp-ad/ | AMP ad format |

## Why no vendoring

Each package has its own upstream versioning + security patches.
Committing node_modules or site-packages here would rot immediately.
If a specific version matters for a later experiment, pin it in
`package.json` / `requirements.txt` at the caller site.
