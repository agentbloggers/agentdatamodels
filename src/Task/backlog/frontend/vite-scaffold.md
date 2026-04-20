---
title: Vite + React scaffold at src/frontend/
status: deferred
opened: 2026-04-20
---

## why

Both the benchmark dashboard (`index.html` + `components/*.jsx`) and
the voice-chat demo (`src/live/voice-chat/`) ship as static pages
with React via CDN and Babel-standalone compiling JSX in the
browser. That's fine for a workshop artifact but costs us: no HMR,
no type-checking on the components, and every page load recompiles
every JSX file.

A `src/frontend/` Vite scaffold would give us HMR, real TypeScript,
and a single `npm run dev` for both the dashboard and voice-chat.
It would also let us share a typed tool-registry module between
`app.js` and the eval, removing the regex parsing in `eval.mjs`.

## scope

- In: `src/frontend/` with Vite + React + TS, two routes (`/` →
  dashboard, `/voice` → voice-chat), shared tool-registry module.
- In: `make dev-frontend` target + a Dockerfile entry that picks
  the Vite build as the deployable artifact.
- Out: rewriting the `claude.ai/design` handoff format. The
  existing `index.html` and `components/*.jsx` stay until the
  Vite app reaches parity.
- Out: converting the `server.mjs` token proxy — it stays zero-dep
  Node.

## test recipe

```bash
make dev-frontend           # vite dev on :5174
make eval-voice-chat        # still passes against the new bundle
make test-web               # smoke-fetches both routes
```

Plus: one manual session through the voice-chat page with a real
`GEMINI_API_KEY`.

## blockers / open questions

- Does `claude.ai/design` still round-trip (via `__activate_edit_mode`
  postMessage) when the page is served through Vite instead of the
  Babel-standalone shell? Need to test before committing.
- Does the Vite build break the `data-screen-label` convention the
  dashboard uses for auto-screenshotting? If yes, keep the
  dashboard as-is and only port voice-chat.
- CLAUDE.md explicitly prefers editing existing files — any
  `src/frontend/` PR needs a one-line update to CLAUDE.md carving
  out the new root, and an entry in `src/web/README.md`'s adjacency
  list.
