# graphql

GitHub GraphQL API — primitives + directives for this repo.

## Why GraphQL (not REST)

- **Single endpoint**, one round-trip per query, no over/under-fetching.
- **Nested traversal** — get PR + reviews + commits + files in one call.
- **Projects v2 / Discussions / Dependency graph / Secret scanning** —
  surfaces GitHub never exposed via REST v3.
- **Rate budget** — 5,000 points/hr per token (vs 5,000 requests/hr
  on REST). Deep nested queries cost more, but batch aliases let you
  collapse N repo queries into 1.

Use REST when the endpoint is write-specific and GraphQL would need
many mutations (e.g. release uploads, some admin actions).

## Three paths we use

| Path | When |
|---|---|
| `gh api graphql` | CI, scripts, quick queries; `gh` must be installed + `GH_TOKEN` set |
| `@octokit/graphql` + plugin-paginate-graphql | Node scripts — type-safe, pagination-automated |
| MCP server (`@modelcontextprotocol/server-github`) | Inside a Claude Code session — GraphQL tools appear as native tools |

Pinned (see `src/web/dependencies/manifest.yaml`):

- `@octokit/graphql@9.0.3` — Node ≥ 20
- `@octokit/plugin-paginate-graphql@6.0.0`
- `@octokit/graphql-schema@15.26.1` — downloadable schema + validator

## Auth

- CLI: `gh auth login` (interactive) or `GH_TOKEN=...` (non-interactive).
  `gh` reads `GH_TOKEN` automatically.
- Octokit: `graphql.defaults({ headers: { authorization: `token ${token}` } })`.
- GitHub Apps: JWT with installation token — use
  `@octokit/auth-app` for rotation.
- For **GitHub Enterprise** this repo sits under: PATs may be
  restricted by SAML SSO; a fine-grained PAT authorized for the org
  is required.

## Node-and-point rate limit

Each query costs points (not requests):

- Base: 1 point
- Additional: 1 point per 100 nodes returned
- Certain expensive fields cost more (e.g. `issues(first: 100)` in a
  nested traversal)

Check remaining:
```bash
gh api graphql -f query='query{rateLimit{limit remaining resetAt cost nodeCount}}' \
  -f dummy=noop
```

Response shape: `rateLimit { limit, remaining, cost, nodeCount, resetAt }`.
Include `rateLimit { cost remaining }` in your queries during
development to size batches.

## Queries library

`src/web/graphql/queries/` holds reusable `.graphql` files. One query
per file, with a comment header describing purpose + point cost.

Naming convention: `<subject>-<verb>.graphql` (e.g.
`repo-latest-release.graphql`, `pr-full-thread.graphql`).

## Pagination

All list fields paginate via `first: N, after: $cursor` +
`pageInfo { hasNextPage endCursor }`. Max `first: 100`.

With `@octokit/plugin-paginate-graphql`:

```js
import { Octokit } from "@octokit/core";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";

const MyOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new MyOctokit({ auth: process.env.GH_TOKEN });

const all = await octokit.graphql.paginate(`
  query($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequests(first: 100, after: $cursor, states: OPEN) {
        nodes { number title }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`, { owner: "agentbloggers", repo: "agentdatamodels" });
```

The plugin walks every page automatically — no manual cursor loop.

## Schema

The `@octokit/graphql-schema` package ships the GitHub GraphQL schema
+ a runtime validator. We use it in CI to catch queries that would
fail at request time.

```js
import { validate } from "@octokit/graphql-schema";
import { readFileSync } from "node:fs";

const errors = validate(readFileSync("src/web/graphql/queries/pr-full-thread.graphql", "utf8"));
if (errors.length) { console.error(errors); process.exit(1); }
```

## Mutations

Always request `id` on the created/updated node so a follow-up query
can reference it:

```graphql
mutation($issueId: ID!, $body: String!) {
  addComment(input: { subjectId: $issueId, body: $body }) {
    commentEdge { node { id url } }
  }
}
```

## Schema explorer

- Explorer UI: `https://docs.github.com/en/graphql/overview/explorer`
- Reference: `https://docs.github.com/en/graphql/reference`
- Breaking-change log: `https://docs.github.com/en/graphql/overview/breaking-changes`
- Public schema (download): `https://docs.github.com/en/graphql/overview/public-schema`

## Directives

- Use **query variables**, never string interpolation. Variables let
  GitHub cache the parsed query AST.
- Include `rateLimit { cost remaining }` in new queries until you
  know their cost.
- Prefix pagination loops with a budget check; bail at `remaining < 100`.
- For repeated queries, vendor them into
  `src/web/graphql/queries/<name>.graphql` and load from disk — don't
  inline large queries in JS.
- Validate queries against `@octokit/graphql-schema` in `make lint-web`
  (planned — tracked as a separate TODO when we add JS tooling).
- Never commit a PAT; always read from `GH_TOKEN`.

## Related

- `src/web/dependencies/` — control plane that USES GraphQL.
- `.claude/skills/github-graphql/SKILL.md` — entry-point skill with
  common queries.
- `.claude/skills/octokit-paginate/SKILL.md` — pagination-specific
  examples.
- `.claude/scripts/graphql-deps.sh` — bash consumer of `gh api graphql`.

## Source

`https://docs.github.com/en/graphql`,
`https://github.com/orgs/octokit/repositories`,
`https://github.com/orgs/graphql/repositories`
