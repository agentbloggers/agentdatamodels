# ads.txt / app-ads.txt

Publisher-authored plaintext file at `/ads.txt` (or `/app-ads.txt` for
mobile/CTV apps) declaring which sellers/resellers are authorised to
sell that domain's inventory.

## Sources (live)

- Spec: https://iabtechlab.com/wp-content/uploads/2022/04/Ads.txt-1.1.pdf
- GitHub: https://github.com/InteractiveAdvertisingBureau/adstxt
- app-ads.txt guidance: https://iabtechlab.com/ads-txt/app-ads-txt/

## Shape

```
# <Exchange domain>, <Seller account ID>, <Relationship>, <Cert authority>
google.com, pub-1234567890, DIRECT, f08c47fec0942fa0
rubiconproject.com, 12345, RESELLER, 0bfd66d529a55807
```

Fields (comma-separated):
1. **Exchange domain** — the `asi` value used in SupplyChain Object
2. **Publisher account ID** — the seller's ID at that exchange
3. **Relationship** — `DIRECT` or `RESELLER`
4. **(optional) Certification ID** — TAG-CERT ID for the exchange

## Why it matters

- **Domain spoofing defense** — DSPs reject bids for a domain whose
  ads.txt doesn't list the seller presenting them.
- **Path validation** — every hop's `asi`/`sid` in SupplyChain Object
  must appear in the publisher's ads.txt.
- **app-ads.txt** — the mobile/CTV equivalent, hosted at the developer
  domain declared in the app store listing.

## Tools

- IAB's crawler-compatible parser: `adstxt` npm package
- `sellers.json` lookup + `ads.txt` validator combined:
  https://ads.cert.iab.tech (IAB TAG-CERT)
