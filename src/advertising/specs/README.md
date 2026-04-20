# Specs — IAB Tech Lab standards

## What's here

- **`openrtb-2-6.pdf`** — IAB Tech Lab *OpenRTB 2.6 FINAL* (Apr 2022,
  90 pages). Canonical bid-request/bid-response protocol.
  Source: https://iabtechlab.com/wp-content/uploads/2022/04/OpenRTB-2-6_FINAL.pdf
- **`supplychain-object.md`** — link + summary for SupplyChain Object
- **`ads-txt.md`** — link + summary for ads.txt
- **`sellers-json.md`** — link + summary for sellers.json

## What's not downloaded

Most post-2.6 IAB specs are maintained as markdown in GitHub repos
under https://github.com/InteractiveAdvertisingBureau. Clone directly
when a live version matters:

```bash
git clone https://github.com/InteractiveAdvertisingBureau/openrtb.git
git clone https://github.com/InteractiveAdvertisingBureau/adstxt.git
git clone https://github.com/InteractiveAdvertisingBureau/openrtb-extensions.git
```

## OpenRTB 2.6 — the sections that matter for DSP/signal work

| Section | Why you care |
|---|---|
| 3.2.7 Source | SupplyChain Object lives here — SPO's key signal |
| 3.2.18 User | Consent (TCF), IFA/PPID, eids |
| 3.2.20 Device | IFA, geo, UA, OS — the fingerprint layer |
| 3.2.24 Pmp | Private marketplaces + deal IDs |
| 5.18–5.22 | IAB taxonomies (categories, content, creative) |

## Related

- **OMID** (Open Measurement Interface Definition) —
  https://github.com/InteractiveAdvertisingBureau/Open-Measurement-SDKs
- **TCF v2** (Transparency & Consent Framework) —
  https://iabeurope.eu/transparency-consent-framework/
- **VAST / VPAID** (video ad-serving) — https://iabtechlab.com/standards/vast/
