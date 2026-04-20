# SupplyChain Object

A field inside `BidRequest.source.ext.schain` that declares every hop
between the publisher and the DSP. Core signal for supply-path
optimization (SPO) and fraud detection.

## Sources (live)

- Spec in OpenRTB 2.6 — `specs/openrtb-2-6.pdf` §3.2.8 (SupplyChain)
- GitHub: https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/supplychainobject.md
- Implementation guidance: https://iabtechlab.com/blog/supply-chain-object-implementation-guidance/

## Shape (abbreviated)

```json
{
  "source": {
    "ext": {
      "schain": {
        "complete": 1,
        "ver": "1.0",
        "nodes": [
          { "asi": "exchange1.com", "sid": "1234", "hp": 1 },
          { "asi": "exchange2.com", "sid": "abcd", "hp": 1 }
        ]
      }
    }
  }
}
```

- `complete: 1` — every upstream hop is declared.
- `hp: 1` — node is the one that sent the bid request.
- `asi` — exchange domain (ads.txt `DOMAIN`).
- `sid` — seller ID at that exchange (sellers.json `seller_id`).

## Why it matters

- **SPO** — buyers prune the longest / lowest-win-rate paths. Measured
  in Jounce Media's annual reports.
- **Fraud** — incomplete or inconsistent chains are red flags for
  MFA (made-for-advertising) and reseller laundering.
- **Reporting** — CTV buyers use it to bind spend to a single authorised
  path per inventory deal.

## Related

- `ads-txt.md` — declares which `sid`s each publisher has authorised
- `sellers-json.md` — exchange-side identity lookup for `sid` values
