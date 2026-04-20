# codeintelligence

What Claude Code can *understand* about code without running it.

## Static-analysis primitives

| Primitive | Surface |
|---|---|
| Text + regex search | `Grep` (ripgrep, with `multiline`, `type`, `glob`) |
| File pattern matching | `Glob` |
| File read with line numbers | `Read` (returns `cat -n` format) |
| LSP diagnostics / go-to-def | LSP plugins (see `lsp/README.md`) |
| AST-level edits | Tree-sitter / custom tools (user-provided) |

## When to reach for an LSP

| Task | LSP helps? |
|---|---|
| Rename a symbol across the repo | ✅ (semantic, handles shadowing) |
| Find all usages | ✅ |
| Type errors | ✅ |
| "Find this string" | ❌ (Grep is faster) |
| "Find functions named X" | Maybe (Grep with `\bfunction\s+X\b` often enough) |

## Intelligence without LSP

- **Grep with line numbers** (default `-n: true`) gives every match a
  `file_path:line_number` anchor — use these in prompts.
- **Tree-sitter** via the `ast-grep` CLI (not bundled) for structural
  search.
- **`codeintelligence/` topic in this repo** — document project-
  specific idioms here (e.g., "utility functions live in
  `src/utils/`, all exported via `index.ts`").

## Directives

- Prefer Grep + file reads over "run the linter and fix errors" —
  the latter requires the linter to exist and run fast.
- When renaming non-trivially, use the TypeScript LSP plugin + `Edit`
  (manual rename) rather than a big `replace_all` which can catch
  substrings.
- For "find all API endpoints" kinds of queries, define a **skill**
  that codifies the search pattern. Reuse it.

## This repo's code-intelligence signals

- No `package.json` (static site with Babel standalone).
- No types (React + JSX, untyped).
- When we add types, re-visit `lsp/` to enable `typescript-lsp`.

## Source

`/en/tools-reference`, `claude-plugins-official` LSP plugins
