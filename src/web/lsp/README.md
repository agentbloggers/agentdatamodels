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

## Directives

- LSP plugins are heavy on tool schemas. Leave
  `ENABLE_TOOL_SEARCH=auto` so only needed schemas load.
- For this repo: `typescript-lsp` is the relevant one **if** we
  bundle the React dashboard with types (currently untyped). Enable
  when the first `.ts` or `.tsx` is added.
- LSP plugins run locally. Cloud sessions won't have the LSP binaries
  unless the env's setup script installs them.

## Source

`claude-plugins-official` marketplace,
`claude.com/plugins`
