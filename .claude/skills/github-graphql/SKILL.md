---
name: github-graphql
description: Use when the user asks to query or mutate GitHub beyond what the REST v3 API exposes — e.g. batch field selection, projects v2, discussions, advanced search, repository insights, secret scanning alerts, dependency graph, or anything where the REST API would need multiple calls to fetch what one GraphQL query returns. Triggers on phrases like "graphql", "projects v2", "discussion", "deep PR query", "repo insights", "dependency graph".
---

# GitHub GraphQL — advanced query toolkit

GitHub exposes two APIs: REST v3 (what `gh api` defaults to) and
GraphQL v4 (what you should reach for when you need **fewer
round-trips** or **data REST doesn't expose**).

## When GraphQL > REST

| Task | REST | GraphQL |
|---|---|---|
| Fetch PR + reviews + commits + files in one call | 4 calls | 1 query |
| Projects v2 (the new Projects) | not available | full support |
| Discussions | limited | full support |
| Advanced search with cursor pagination | paginate per type | unified |
| Repo insights (traffic, clones) | multiple calls | unified |
| Bulk batch — N repos, same fields | N calls | 1 call with aliases |

## How to invoke

Three ways, ranked by preference:

### 1. `gh api graphql` (always available if `gh` is installed)

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      pullRequests(first: 5, states: OPEN) {
        nodes {
          number
          title
          reviews(first: 10) { nodes { author { login } state body } }
          commits(last: 10) { nodes { commit { oid message } } }
        }
      }
    }
  }
' -f owner=agentbloggers -f repo=agentdatamodels | jq
```

### 2. `@octokit/graphql` from a `claude -p` script or Agent SDK tool

```typescript
import { graphql } from "@octokit/graphql";

const gql = graphql.defaults({
  headers: { authorization: `token ${process.env.GH_TOKEN}` },
});

const data = await gql(`
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      discussions(first: 10) {
        nodes { number title category { name } upvoteCount }
      }
    }
  }
`, { owner: "agentbloggers", repo: "agentdatamodels" });
```

### 3. MCP — add a GraphQL-capable MCP server

```json
// .mcp.json
{
  "mcpServers": {
    "github-graphql": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

The official `@modelcontextprotocol/server-github` exposes both REST
and a `search_code` GraphQL operation plus advanced queries.

## Common queries for this repo's workflows

### Find PRs awaiting Claude review

```graphql
query {
  repository(owner: "agentbloggers", name: "agentdatamodels") {
    pullRequests(first: 20, states: OPEN, labels: ["claude-review"]) {
      nodes {
        number title
        isDraft
        reviewDecision
        author { login }
        statusCheckRollup { state }
      }
    }
  }
}
```

### Link a Routine run to an issue

```graphql
mutation($issueId: ID!, $body: String!) {
  addComment(input: { subjectId: $issueId, body: $body }) {
    commentEdge { node { id url } }
  }
}
```

### Projects v2 status roll-up

```graphql
query($org: String!, $number: Int!) {
  organization(login: $org) {
    projectV2(number: $number) {
      items(first: 50) {
        nodes {
          content {
            ... on Issue { number title state }
            ... on PullRequest { number title state }
          }
          fieldValues(first: 8) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
            }
          }
        }
      }
    }
  }
}
```

## Directives

- Use **variables** (`query($x: String!) { … }`), not string
  interpolation — prevents injection and lets GitHub cache the query.
- Paginate with `pageInfo { hasNextPage endCursor }` + `after: $cursor`.
  Default page size is 30; max is 100.
- Rate limit: **5,000 points/hour**. Deep nested queries cost more —
  `gh api graphql --rate-limit` (or inspect `X-RateLimit-*` headers)
  shows remaining budget.
- For write operations, request `id` on every mutation result so you
  can reference the created node in a follow-up query.
- Secret scanning / dependency graph fields may require
  org-admin / repo-admin scopes — check the field docs at
  `docs.github.com/en/graphql/reference`.

## Installation (for this repo)

This skill assumes `gh` is already installed. For the `@octokit/graphql`
path, install locally:

```bash
npm install @octokit/graphql
```

For the MCP-server path, add the entry above to `.mcp.json` and run
`/reload-plugins` (or just restart the session).

## Reference

- GraphQL explorer: `https://docs.github.com/en/graphql/overview/explorer`
- Schema reference: `https://docs.github.com/en/graphql/reference`
- `gh api graphql` docs: `https://cli.github.com/manual/gh_api`
- Octokit GraphQL.js: `github.com/octokit/graphql.js`
