# lsp

Language Server Protocol plugins from the `claude-plugins-official`
marketplace. Give Claude Code real-time type-checking, go-to-def,
and rename capabilities via each language's canonical LSP.

## Available LSP plugins

All from `claude-plugins-official` (auto-available, no marketplace add
needed):

| Plugin | Language | Underlying LSP |
|---|---|---|
| `typescript-lsp` | TypeScript / JavaScript | `typescript-language-server` |
| `pyright-lsp` | Python | Pyright |
| `rust-analyzer-lsp` | Rust | rust-analyzer |
| `gopls-lsp` | Go | gopls |
| `clangd-lsp` | C / C++ | clangd |
| `jdtls-lsp` | Java | Eclipse JDT LS |
| `kotlin-lsp` | Kotlin | kotlin-language-server |
| `csharp-lsp` | C# | OmniSharp |
| `lua-lsp` | Lua | lua-language-server |
| `php-lsp` | PHP | Intelephense |
| `swift-lsp` | Swift | sourcekit-lsp |

## Installing

```
/plugin install typescript-lsp@claude-plugins-official
/reload-plugins
```

Most LSPs require the underlying binary installed on the system
(e.g. `npm install -g typescript-language-server typescript`).
The plugin's Errors tab surfaces "Executable not found in $PATH"
when the binary is missing.

## What each LSP plugin contributes

- Tool-namespaced diagnostics: `typescript-lsp__diagnostics`
- Go-to-def / references
- Rename symbol
- Hover info

These appear as additional tools in the session — Claude uses them
during exploration and refactoring.

## Upstream LSP references (pinned)

All eight upstream LSP reference pages are tracked in
`src/web/dependencies/manifest.yaml` and drift-checked by
`make graphql-web`. Cite from the pinned snapshot when designing
any new LSP plugin or extending `docs-lsp`.

| Page | Use |
|---|---|
| `specifications/lsp/3.17/specification/` | Canonical protocol — message shapes, capabilities, URI schemes |
| `overviews/lsp/overview/` | Why LSP exists, N×M → N+M reframe |
| `overviews/lsif/overview/` | Language Server Index Format — pre-computed nav data for huge repos |
| `implementors/servers/` | Community + vendor server list across every language |
| `implementors/tools/` | Editors + IDEs that consume LSP |
| `implementors/sdks/` | Per-language SDKs for authoring a server (`vscode-languageserver-node`, `pygls`, `lsp4j`, etc.) |
| `implementors/utilities/` | LSP-adjacent tooling (proxies, debug bridges, mocks) |

## The JSON / YAML / Markdown gap (fixed via `docs-lsp`)

No official `claude-plugins-official` LSP covers the file types
this repo actually edits most — `.json`, `.yaml`, `.md`. The gap
manifests as `No LSP server available for file type: .json` when
the LSP tool is invoked on `.claude/settings.json`.

**Decision — fill, don't bypass.** `make lint-web`'s python
parsers catch structural errors but not schema violations or
cross-file references. A local plugin at
`.claude-plugins/docs-lsp/` declares servers for the three
file types against their upstream SDKs:

| Language | Server | SDK lineage |
|---|---|---|
| `json` | `vscode-json-languageserver` | Microsoft `vscode-languageserver-node` |
| `yaml` | `yaml-language-server` | Red Hat (built on `vscode-languageserver-node`) |
| `markdown` | `marksman` | Community, Rust |

See `.claude-plugins/docs-lsp/README.md` for install instructions.
The plugin is **enabled** in `.claude/settings.json` but
self-disables gracefully when binaries are absent (plugin-reference
behavior — Errors tab surfaces the missing binary, session
continues).

## Directives

- LSP plugins are heavy on tool schemas. Leave
  `ENABLE_TOOL_SEARCH=auto` so only needed schemas load.
- For this repo: `typescript-lsp` handles the React benchmark
  dashboard; `docs-lsp` handles JSON/YAML/MD; every other language
  stays on-demand.
- LSP plugins run locally. Cloud sessions won't have the LSP binaries
  unless the env's setup script installs them. The cloud `setup.sh`
  (Phase C scope) installs `vscode-json-languageserver` +
  `yaml-language-server` so `docs-lsp` works in cloud sessions too.
- When authoring a new LSP plugin, cite the 3.17 spec snapshot for
  the message/capability shape rather than hallucinating it.
- For codebases large enough that live LSP queries are slow,
  pre-compute nav data with LSIF (`overviews/lsif/overview/`) —
  not needed yet but worth knowing about.

## Source

- `claude-plugins-official` marketplace, `claude.com/plugins`
- `https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/`
- `https://microsoft.github.io/language-server-protocol/overviews/lsp/overview/`
- `https://microsoft.github.io/language-server-protocol/overviews/lsif/overview/`
- `https://microsoft.github.io/language-server-protocol/implementors/servers/`
- `https://microsoft.github.io/language-server-protocol/implementors/tools/`
- `https://microsoft.github.io/language-server-protocol/implementors/sdks/`
- `https://microsoft.github.io/language-server-protocol/implementors/utilities/`
