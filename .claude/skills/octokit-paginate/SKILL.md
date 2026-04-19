---
name: octokit-paginate
description: Use when a GitHub GraphQL query needs to walk more than one page of results — listing all repos in an org, all PRs across a label, all discussions in a repo, full commit history. Triggers on phrases like "all repos", "every PR", "full history", "paginate", "walk the list", "across all branches".
---

# octokit-paginate

Use `@octokit/plugin-paginate-graphql@6.0.0` to walk every page of a
GraphQL list field automatically — no manual `pageInfo` loop.

## When to reach for this

| Symptom | Use this skill |
|---|---|
| "I need all X from the org, not just the first 100" | ✅ |
| "The query stops at 100 items" | ✅ |
| "Manual `after:` cursor loop" you wrote | ✅ replace it |
| "I need one specific item by number/ID" | ❌ single query, no paginate |
| "I already know the count is < 100" | ❌ single query, no paginate |

## Install

Already pinned in `package.json` (this repo):

```
@octokit/graphql@9.0.3
@octokit/plugin-paginate-graphql@6.0.0
```

Run once: `make install-web`.

## Minimal example

```js
// scripts/list-all-org-repos.js
import { Octokit } from "@octokit/core";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";

const MyOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new MyOctokit({ auth: process.env.GH_TOKEN });

// The query MUST include `pageInfo { hasNextPage endCursor }` and
// `after: $cursor` in the arguments.
const result = await octokit.graphql.paginate(`
  query paginate($cursor: String) {
    organization(login: "agentbloggers") {
      repositories(first: 100, after: $cursor) {
        nodes {
          name
          isArchived
          defaultBranchRef { target { ... on Commit { oid committedDate } } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`);

console.log(result.organization.repositories.nodes.length, "repos");
```

The plugin appends successive pages' `nodes` arrays into one result
so you get the full list without a loop.

## Nested pagination

The plugin can also walk nested connections if they're on the same
query path. For multi-axis pagination (e.g. for each repo, all PRs,
for each PR, all reviews), write a top-level paginate for repos,
then a nested paginate per repo. Don't try to paginate two axes in
one query — it over-fetches.

```js
const repos = await octokit.graphql.paginate(`
  query($cursor: String) {
    organization(login: "agentbloggers") {
      repositories(first: 100, after: $cursor) {
        nodes { name }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`);

const prs = [];
for (const r of repos.organization.repositories.nodes) {
  const rPrs = await octokit.graphql.paginate(`
    query($repo: String!, $cursor: String) {
      repository(owner: "agentbloggers", name: $repo) {
        pullRequests(first: 100, after: $cursor, states: OPEN) {
          nodes { number title author { login } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `, { repo: r.name });
  prs.push(...rPrs.repository.pullRequests.nodes.map(p => ({ repo: r.name, ...p })));
}
```

## Rate-limit awareness

Include `rateLimit { cost remaining }` in the first page of your
query and bail if you'd exhaust the budget:

```js
const BUDGET_FLOOR = 500;
const first = await octokit.graphql(`
  query($cursor: String) {
    organization(login: "agentbloggers") {
      repositories(first: 100, after: $cursor) {
        nodes { name }
        pageInfo { hasNextPage endCursor }
      }
    }
    rateLimit { cost remaining }
  }
`);
if (first.rateLimit.remaining < BUDGET_FLOOR) {
  throw new Error("GraphQL budget too low; aborting pagination");
}
```

## When NOT to use

- Small, known-bounded lists (< 100 items): one query is cheaper
  than two.
- Writes (mutations don't paginate).
- Cross-type searches — `search` field caps at 1000 results
  regardless of pagination; use it with a narrow query instead.

## Directives

- **Every** paginate target MUST include `pageInfo { hasNextPage
  endCursor }`. Missing either = plugin can't advance.
- **Every** paginate target MUST include `after: $cursor` with a
  `$cursor: String` variable declaration.
- Keep `first: 100` (the max). Smaller page sizes cost more.
- Do NOT interleave writes inside a paginate loop — if a write
  fails mid-walk, the result is inconsistent.

## Related

- `src/web/graphql/README.md` — broader GraphQL primitives
- `.claude/skills/github-graphql/SKILL.md` — entry-point skill
- `src/web/graphql/queries/org-repos-list.graphql` — reusable query
