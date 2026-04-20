# markdown

`markdown-it@14.1.1` — our markdown parser/renderer. Used by the
`docs-librarian` subagent to deterministically regenerate
`src/web/*.md` files from upstream snapshots.

## Why a parser (not regex)

`docs-librarian` needs to:

- Extract YAML frontmatter from agent / skill / rule files
- Preserve stable anchor links across regenerations
- Split a long doc into sections by heading
- Replace a code block in-place without touching prose

Regex can't do these reliably. `markdown-it` gives us a **token
stream** (not an AST) that's simple to walk and mutate.

## Architecture

markdown-it runs a three-stage pipeline (per
`github.com/markdown-it/markdown-it/blob/master/docs/architecture.md`):

```
input ──▶ Tokenizer ──▶ token stream ──▶ Renderer ──▶ output
           │
           ├── core chain   (normalization, final transforms)
           ├── block chain  (headings, lists, blockquotes, paragraphs)
           └── inline chain (bold, italic, links, code)
```

Each chain is a `Ruler` instance with ordered rules. Rules can be
enabled/disabled at runtime via `md.core.ruler.disable(...)` etc.

## Token stream (not AST)

- Array of `{ type, tag, nesting, content, children, attrs, … }`.
- Opening + closing tags are **separate** tokens (`heading_open` /
  `heading_close`).
- Inline tokens have `children` with a nested token stream.
- Top level = block tokens; each inline-container block has
  `children` for its inline markup.

## Minimal usage

```js
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

const tokens = md.parse(readFileSync("CLAUDE.md", "utf8"), {});
for (const t of tokens) {
  if (t.type === "heading_open") console.log("heading", t.tag, tokens[tokens.indexOf(t)+1].content);
}
```

## Plugins we pin

| Plugin | Version | Purpose |
|---|---|---|
| `markdown-it-anchor` | 9.2.0 | Stable `id="..."` on headings for cross-doc linking |
| `markdown-it-front-matter` | 0.2.4 | Extract `---…---` YAML frontmatter (subagents, skills, seed prompts) |

```js
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import frontMatter from "markdown-it-front-matter";

let fm = null;
const md = new MarkdownIt({ html: false });
md.use(frontMatter, (str) => { fm = str; });
md.use(anchor, { slugify: s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-") });

const html = md.render(readFileSync(".claude/agents/docs-librarian.md", "utf8"));
// `fm` now holds the YAML frontmatter block as a string.
```

## How `docs-librarian` uses it

1. `md.parse(newSnapshot)` → tokens_new
2. `md.parse(oldSnapshot)` → tokens_old
3. Walk by `heading_open` / `heading_close` to identify sections
4. Diff tokens section-by-section; produce a human-readable changelog
5. Rewrite downstream file preserving order + anchors

## Renderer overrides

Override rendering for a specific token type:

```js
md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
  const t = tokens[idx];
  // e.g. wrap every code fence in a <figure> with a copy button
  return `<figure data-lang="${t.info}"><pre><code>${self.renderAttrs(t)}${md.utils.escapeHtml(t.content)}</code></pre></figure>`;
};
```

Signature: `(tokens, idx, options, env, renderer) => string`.

## Lint use-case (planned)

`make lint-web` will grow a markdown check step:

- Parse every `.md` in `src/web/`
- Fail if a heading is duplicated within a file
- Fail if a fenced code block has no language tag
- Fail if frontmatter exists but is invalid YAML

Not yet implemented — tracked in the plan file.

## Directives

- Never run markdown through regex when you can run it through
  `markdown-it`. The token stream is the single source of truth.
- Use `md.utils.escapeHtml` when rendering user content.
- Disable `html: true` unless you deliberately want inline HTML
  (we don't — our docs are pure markdown + code fences).
- Keep `linkify: true` so plain URLs become clickable in rendered
  output (no regression vs GitHub rendering).

## Source

- `https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md`
- `https://markdown-it.github.io/markdown-it/` (API reference)
- `https://github.com/markdown-it/markdown-it-anchor`
- `https://github.com/ParamagicDev/markdown-it-front-matter`
