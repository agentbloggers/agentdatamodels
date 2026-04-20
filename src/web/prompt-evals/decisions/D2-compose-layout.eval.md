---
name: D2 — docker-compose layout (base + observe profile)
decision: "docker-compose.yml exposes postgres + redis in base, plus otel-collector + prometheus + grafana behind the `observe` profile"
wa_provenance:
  - https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/  # RV.1 audit-log streaming precursor
  - https://wellarchitected.github.com/library/application-security/design-principles/  # Keep it Simple
scope: both
timeout: 30
---

# Check

1. `test -f docker-compose.yml`.
2. `docker compose config -q` exits 0 (YAML parses, schema valid).
3. `docker compose --profile observe config -q` exits 0.
4. Count services:
   - Base (`docker compose config --services | wc -l`) == 2.
   - With observe (`docker compose --profile observe config --services | wc -l`) == 5.
5. Assert the observe profile set includes
   `{otel-collector, prometheus, grafana}`.

Return `{"ok": true, "reason": "compose layout intact"}` on all
passing; otherwise name the failing predicate.

# Scorer

- All five predicates above pass.
- `docker compose config --services` equals `postgres\nredis\n` (sorted).

# Skip condition

If `command -v docker` fails, return
`{"ok": true, "reason": "docker unavailable — skipped"}` and log
the skip. Docker is optional at doctor time; D2 is only
actionable when the daemon is present.
