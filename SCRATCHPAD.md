# Scratchpad — context gathering for claude.ai/design

Goal: understand what claude.ai/design is, what the handoff bundle format
implies, and whether our current implementation matches the intended
deployment shape. The original design was authored in that tool.

## 1. Primary sources (WebFetch)

- `https://www.anthropic.com/news/claude-design-anthropic-labs` — the launch
  announcement. Gives us positioning, feature list, intended workflow.
- `https://claude.ai/design` — product surface; likely gated, may redirect.
- `https://www.anthropic.com/labs` — Anthropic Labs umbrella; context on
  where this sits relative to other experiments.

## 2. Anthropic product docs (WebFetch / WebSearch)

- `https://docs.claude.com/` — Claude API and Claude Code docs. Check for
  any "design handoff" or "export" references.
- `https://docs.claude.com/en/docs/claude-code/` — Claude Code reference;
  the README in the bundle explicitly addresses "coding agents", so there
  may be a formal handoff protocol documented here.
- Anthropic cookbook / examples repo on GitHub — look for design→code
  workflows.

## 3. Library docs via the docs MCP (`mcp__…__resolve-library-id` +
   `mcp__…__query-docs`)

The bundle ships plain React via CDN. Packages worth resolving so we can
decide whether to keep the CDN prototype shape or rebuild:

- `react` (18.3.1) — confirm current stable, hook APIs used.
- `react-dom/client` — `createRoot` usage.
- `@babel/standalone` — in-browser JSX compile; note its production
  caveats so we can flag the tradeoff.
- `vite` or `next` — likely targets if we want to convert to a real
  bundled app for agentdatamodels.com.
- `tailwindcss` — not used in the prototype (inline styles throughout),
  but worth checking if we plan to restyle.

## 4. Things to look for specifically

- Does the handoff bundle have a documented schema? (README mentions
  `/chats`, `/project`, `EDITMODE-BEGIN` markers, `postMessage` edit
  protocol — is this public?)
- Is `__activate_edit_mode` / `__edit_mode_set_keys` a published contract
  we should preserve so the page can round-trip back into claude.ai/design
  for further editing?
- Are there recommended deployment patterns (static host vs. Next.js vs.
  Worker)?

## 5. Output of this research

After gathering, I'll:

1. Summarize what claude.ai/design is and how the handoff is meant to
   work.
2. Decide whether the current `index.html` + `components/*.jsx` + CDN
   React layout is the right shape for agentdatamodels.com, or whether
   we should bundle (Vite + React) for production.
3. Flag anything in the prototype that is editor-specific and safe to
   remove (e.g. the `postMessage` edit-mode handshake) vs. worth keeping.

## 6. Execution order

1. WebFetch the launch article + Labs page.
2. WebSearch for "claude.ai/design handoff bundle" to find any public
   spec or examples.
3. `resolve-library-id` for react, react-dom, @babel/standalone; then
   `query-docs` on the ones that matter for a production rebuild.
4. Write findings back here as a "Findings" section, then recommend
   next concrete change to the repo.
