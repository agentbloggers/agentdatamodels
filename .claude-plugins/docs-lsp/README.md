# docs-lsp

LSP gap-fill for JSON, YAML, and Markdown — the three file types
this repo edits most but that no `claude-plugins-official` LSP
currently covers.

## What it wires

| Language | Server binary | Install |
|---|---|---|
| JSON / JSONC | `vscode-json-languageserver` | `npm install -g vscode-json-languageserver` |
| YAML | `yaml-language-server` | `npm install -g yaml-language-server` |
| Markdown | `marksman` | `brew install marksman` (macOS) / [releases page](https://github.com/artempyanykh/marksman/releases) |

All three are Node / native binaries — no language runtime beyond
Node 18+ needed for JSON + YAML.

## Ambient schema associations

The YAML server is configured with three schema associations that
match repo paths, so `yamllint`-style diagnostics work on edit:

- `/.github/workflows/*.y*ml` → GitHub Actions workflow schema
- `/.github/dependabot.y*ml` → Dependabot 2.0 schema
- `/docker-compose*.y*ml` → Compose-spec schema

Schemas come from `json.schemastore.org` and the compose-spec repo.
Add more in `.lsp.json` → `yaml.settings.yaml.schemas` as new
config file families land.

## Behavior when binaries are absent

Per the plugin-reference docs: "If you see `Executable not found
in $PATH` in the `/plugin` Errors tab, install the required
binary for your language." The session continues; LSP calls on
the missing language type return the same
`No LSP server available for file type: .json` error we saw
before the plugin existed.

Cloud sessions: the environment setup script (Phase C scope)
installs `vscode-json-languageserver` and `yaml-language-server`
via `npm install -g`. `marksman` is optional — Markdown LSP
features are nice-to-have, not load-bearing.

## Why a local plugin vs. upstream

Per `src/web/plugins.md`, plugins are the right surface for
project-specific LSP additions. Shipping this via
`.claude-plugins/docs-lsp/` (vendored, not marketplace-added)
means:

- Every cloud session gets it through project-scope settings.
- Schema associations stay alongside the files they validate.
- Upstream breakage (server crash, schema 404) stays contained.

If this plugin stabilizes and generalizes, promote to a separate
marketplace under `agentbloggers/` or propose to
`anthropics/claude-plugins-official`.

## Spec provenance

All LSP message shapes used here conform to the Language Server
Protocol 3.17 specification. See
`src/web/dependencies/manifest.yaml` for the pinned upstream
references:

- LSP 3.17 specification
- `implementors/servers/` — vetted the three server binary choices
- `implementors/sdks/` — `vscode-languageserver-node` is the
  canonical TypeScript SDK both JSON and YAML servers build on

## Source

- `src/web/lsp/README.md` — how LSP plugins fit this repo
- `src/web/plugins-catalog.md` — full official plugin catalog
- `https://code.claude.com/docs/en/plugins-reference#lsp-servers`
- `https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/`
