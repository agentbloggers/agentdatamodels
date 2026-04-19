---
captured: 2026-04-19
surface: claude-code-cli
intent: Correct the "polyrepo deferred" framing — polyrepo is in-progress, not deferred; re-read the polyrepo-engineering recommendation and document it in full detail
context_artifacts:
  - src/web/wellarchitected/README.md
  - src/web/wellarchitected/polyrepo-engineering.md
---

# User prompt

polyrepo-engineering framework (deferred per your direction) , reread https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/

We should document it in detail . I didn’t defer it completely , we have already made confusing process

# Notes

- Pinned release at capture: `@anthropic-ai/claude-code@2.1.114`.
- Correction absorbed: polyrepo work is in flight, not deferred.
  Several of our structural decisions (`manifest.yaml`,
  `upstream-hashes.json`, subagent orchestrator/executor pattern,
  `CLAUDE_CODE_REMOTE_SESSION_ID` as correlation ID) already map
  onto the framework's 8-step implementation.
- Rewrote `src/web/wellarchitected/README.md` with honest
  per-step status table (started / partial / not-started) instead
  of blanket "deferred".
- Adding a companion `polyrepo-engineering.md` with the complete
  recommendation content: 3 pillars, 6 core principles, 8-step
  implementation, 4 coordination-model options with tradeoff
  tables, phased-adoption roadmap.
- Near-term plan items surfaced: introduce `CHG-NNNN` change-set
  IDs, convert `make graphql-web` to a reusable
  `.github/workflows/` workflow, promote `manifest.yaml` to tagged
  artifact releases.
