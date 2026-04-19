# .claude-plugins/

Project-scope home for **vendored / local plugin sources** — plugins
that should live in the repo rather than be fetched per-user from a
marketplace.

## Why

- Cloud sessions can't run `/plugin install` interactively — only
  configured plugins + marketplaces in `.claude/settings.json` load.
- Vendoring plugin source into the repo lets cloud sessions and
  routines use plugins without depending on a per-user install.
- It's also how we keep plugin versions pinned against the
  v2.1.114 CLI (marketplace plugins auto-update on official
  marketplaces; vendoring pins them).

## Layout

```
.claude-plugins/
└── <plugin-name>/              # one directory per vendored plugin
    ├── .claude-plugin/
    │   └── plugin.json         # plugin manifest
    ├── agents/                 # optional subagents bundled with the plugin
    ├── commands/               # optional slash commands
    ├── skills/                 # optional skills
    └── README.md
```

## How to use

Point `.claude/settings.json` at the vendored directory via
`--plugin-dir` when launching `claude -p` in a routine, or by adding
an entry to `enabledPlugins` that references the local path (see
`/en/plugins-reference`).

## Status

Empty by default. Populate only when:

- A plugin doesn't exist on the official or Anthropic marketplaces.
- A plugin needs to be pinned to a specific commit.
- A plugin needs project-local modifications.

Everything already on the marketplaces stays in
`.claude/settings.json`'s `enabledPlugins` — don't duplicate.

## Directives

- Treat vendored plugins as third-party code — read before merging,
  audit for secrets and network calls, pin versions.
- Never vendor a plugin that needs user-level secrets (those go in
  `~/.claude/settings.json`, not the repo).
- When updating a vendored plugin, record the upstream commit in
  its README for provenance.

## Source

`/en/plugins`, `/en/plugins-reference`, `/en/plugin-marketplaces`,
`/en/plugin-dependencies`
