# polyrepo-changesets

GitHub Well-Architected Q1 2026 — the change-set pattern from
implementing-polyrepo-engineering.

This file is the canonical reference for the `CHG-XXXX` identifier
convention. For the full 8-step polyrepo implementation see
`src/web/wellarchitected/polyrepo-engineering.md`.

Cross-links:
- `src/web/wellarchitected/README.md` — framework overview and current
  status table (Step 2: "not started")
- `src/web/wellarchitected/polyrepo-engineering.md` — Step 2 context
- `src/web/dependencies/manifest.yaml`

---

## The CHG-XXXX identifier

A change-set ID is a short, opaque identifier that ties together all
GitHub objects (issues, PRs, branches, labels, releases) that belong to
a single cross-repo change.

Format:

```
CHG-<4-digit-zero-padded-integer>
```

Examples: `CHG-0001`, `CHG-0042`, `CHG-9999`.

The integer is allocated sequentially by the integration repo. It is
stored as the primary key in the `change_sets` table of the backing
Postgres database (see `sql/bootstrap.sql`).

---

## Branch naming

Every branch that is part of a change-set follows the pattern:

```
changeset/CHG-XXXX/<slug>
```

Where `<slug>` is a short, hyphenated description of what this
particular repo's branch is doing within the change.

Examples:

```
changeset/CHG-0001/add-graphql-web-workflow
changeset/CHG-0001/update-manifest-versions
changeset/CHG-0042/migrate-to-github-private
```

The `changeset/` prefix is distinct from the `claude/*` prefix used for
Claude Code session branches. A session may create a `claude/*` branch
that is subsequently renamed (or a new branch created) under
`changeset/CHG-XXXX/` once a change-set ID is assigned.

---

## Label naming

Every PR and issue that belongs to a change-set is labelled:

```
changeset:CHG-XXXX
```

The colon separator distinguishes change-set labels from category
labels (which use hyphens: `type:bug`, `priority:P1`).

Create the label once in each affected repo before opening the first
PR for the change-set. Label colour convention: `#0075ca` (GitHub's
default "enhancement" blue) — visually distinct from the `bug` and
`security` label families.

---

## Parent tracking issue

"Create a parent tracking issue in the integration repo with scope,
impacted repos, and acceptance criteria."

The parent issue lives in the integration repo (currently
`agentbloggers/agentdatamodels` — the single-repo phase). Title format:

```
[CHG-XXXX] <human-readable title>
```

Required body sections:

```markdown
## Scope
One paragraph describing the change.

## Impacted repos
- agentbloggers/agentdatamodels
- agentbloggers/agentX (future)

## Acceptance criteria
- [ ] Predicate 1 (machine-checkable if possible)
- [ ] Predicate 2

## Child issues
- agentbloggers/agentdatamodels#<issue-number>
```

The parent issue carries the `changeset:CHG-XXXX` label. Child issues
in sibling repos carry the same label and link back to the parent.

---

## Change-set release tag

When all acceptance criteria are met, the integration repo is tagged:

```
system-YYYY.MM.DD
```

For example: `system-2026.01.30`.

If multiple change-sets ship on the same day, append a counter:

```
system-2026.01.30-2
```

The tag is created on the integration repo's `main` branch. Sibling
repos are tagged at the same time with the same tag name so the
cross-repo state is reproducible.

---

## Projects v2 custom fields

The GitHub Project tracking the polyrepo work has five custom fields:

| Field name | Field type | Values / format |
|---|---|---|
| Change-set ID | Text | `CHG-XXXX` |
| Team | Single select | `platform`, `security`, `product` |
| Priority | Single select | `P0`, `P1`, `P2` |
| SLA | Date | Target merge or release date |
| Status | Single select | `draft`, `integration`, `released`, `abandoned` |

Items in the Project are linked to the parent tracking issue. Child
issues and PRs from sibling repos are added as sub-items.

---

## `change_sets` table (Postgres backing store)

When the Neon branching pattern is active (see `src/web/neon/`), each
subagent session that works on a change-set gets its own Neon branch.
The `change_sets` table in `sql/bootstrap.sql` is the backing store for
change-set metadata:

```sql
CREATE TABLE change_sets (
  id         TEXT PRIMARY KEY,           -- 'CHG-0001'
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  tracking_issue_url TEXT,
  notes      TEXT
);
```

The `id` column is the canonical allocation surface — insert a row here
before creating any branches or labels for a change-set.

---

## PR review rule for change-set branches

Any PR whose title or branch name matches `/changeset\/CHG-/` must link
a parent tracking issue. This is enforced in the review-skill prompt
(not a status check — it is a code review convention, not a machine
predicate):

> If this PR's branch starts with `changeset/CHG-`, assert that the PR
> description links a parent tracking issue (format: `Resolves #NNN` or
> `Part of #NNN` or `Tracks CHG-XXXX: <url>`). If no parent issue link
> is found, request one before approving.

This rule lives in the review skill, not in a D-eval, because it
requires human judgment about what "links" means.

---

## Current status

The `CHG-XXXX` scheme is **not yet active**. The current session trace
is `$CLAUDE_CODE_REMOTE_SESSION_ID`, which is a UUID, not a change-set
ID. The two are not equivalent:

| Property | `$CLAUDE_CODE_REMOTE_SESSION_ID` | `CHG-XXXX` |
|---|---|---|
| Scope | Single Claude session | One cross-repo change |
| Allocation | Automatic (UUID) | Sequential (manual or scripted) |
| GitHub label | None | `changeset:CHG-XXXX` |
| Tracking issue | None | Required in integration repo |
| Survives across sessions | No | Yes |

The change-set scheme activates when Step 2 of the polyrepo plan is
implemented. Prerequisite: the parent tracking issue convention must be
established in the integration repo first.

---

## Source

- `https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/`
  (Step 2 of 8: change-set pattern)
- Snapshot: `src/web/dependencies/snapshots/implementing-polyrepo-engineering-2026-04-19.md` (populated by `make graphql-web` on 2026-04-19).
- `src/web/wellarchitected/polyrepo-engineering.md` (Step 2)
- `src/web/wellarchitected/README.md` (status table, row 2)
- `src/web/dependencies/manifest.yaml`
