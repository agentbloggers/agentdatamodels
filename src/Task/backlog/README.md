# `src/Task/backlog/` — deferred work, grouped by surface

Each subdirectory is a **backlog** — items we've decided are worth
doing but explicitly deferred so we don't grow the current PR past
the size we want to review.

```
src/Task/backlog/
├── frontend/     — anything that would live under src/frontend/
├── voice-chat/   — improvements to src/live/voice-chat/
└── other/        — everything else
```

## House rules for a backlog item

- One file per item: `<slug>.md`.
- Keep each file ≤ 60 lines. If it's bigger than that, it's no longer
  a backlog item — promote it to an issue or a plan under
  `.claude/plans/`.
- Structure:
  - **why** — one paragraph on the motivation
  - **scope** — what's in, what's explicitly out
  - **test recipe** — how we'd know it's done (a `make` target, an
    eval run, a URL to click)
  - **blockers / open questions** — anything we'd need an answer on
    before starting
- Mark items as `status: deferred | ready | in-progress | done` in
  the YAML-ish header. A file graduates out of the backlog when it
  becomes a real PR — at that point, delete the backlog entry in the
  same commit that ships the change.

## Why not just use GitHub issues

GitHub issues are the source of truth for **assigned, scheduled**
work. This folder is the short-lived staging area for "we talked
about this in a session and parked it". Anything that survives more
than ~2 weeks here should get promoted to an issue or deleted.

## Cloud-session visibility

Everything under `src/Task/backlog/` travels with the repo clone
into cloud sessions, so a Routine / Remote-Control session can read
the backlog without a GitHub API round-trip.
