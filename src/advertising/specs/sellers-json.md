# sellers.json

Exchange-authored JSON file at `/sellers.json` declaring every seller
account (publisher, reseller, intermediary) the exchange represents.
The companion to ads.txt — ads.txt names who's allowed to sell, and
sellers.json identifies who each of those seller IDs actually is.

## Sources (live)

- Spec: https://iabtechlab.com/wp-content/uploads/2019/07/Sellers.json_Final.pdf
- GitHub: https://github.com/InteractiveAdvertisingBureau/openrtb-sellersjson

## Shape (abbreviated)

```json
{
  "contact_email": "adops@exchange.com",
  "version": "1.0",
  "identifiers": [{ "name": "TAG-ID", "value": "abcd1234" }],
  "sellers": [
    {
      "seller_id": "1234",
      "name": "Big Publisher Inc",
      "domain": "bigpub.com",
      "seller_type": "PUBLISHER"
    },
    {
      "seller_id": "5678",
      "name": "Boutique Reseller LLC",
      "domain": "boutique.net",
      "seller_type": "INTERMEDIARY"
    }
  ]
}
```

- `seller_type`: `PUBLISHER`, `INTERMEDIARY`, or `BOTH`.
- Transparent sellers list all three fields; sellers can opt for
  `"is_confidential": 1` and omit `name`/`domain`.

## Why it matters

- **Deduplication** — buyers dedupe the same publisher across multiple
  exchanges by cross-referencing seller IDs.
- **Fraud / reseller chains** — a chain where every intermediary is
  confidential is a red flag.
- **Spend analytics** — binding SSP-reported spend to a publisher
  requires resolving `schain.nodes[].sid` through `sellers.json`.

## Joining the signals

```
BidRequest.source.ext.schain.nodes[i].asi + .sid
    ↓
https://{asi}/sellers.json  →  sellers[].seller_id  →  seller name/domain
```

Combined with ads.txt at the publisher domain, this closes the identity
loop from bid request to publisher entity.
