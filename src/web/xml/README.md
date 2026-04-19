# xml

XML-tag prompting conventions used across Anthropic docs + Claude Code
internals.

## Why XML tags

Claude was trained to respect XML-tagged structure inside prompts.
Tags turn ambiguous "here's some context" into parseable regions.

## Conventions

| Tag | Meaning |
|---|---|
| `<system-reminder>` | Claude Code injects these — coming from the system |
| `<user-prompt-submit-hook>` | Hook output treated as user message |
| `<function_calls>` / `<function>` | Tool-call encoding (the XML inside your stream) |
| `<example>` / `<commentary>` | Few-shot framing |
| `<thinking>` | Internal reasoning (extended-thinking mode) |
| `<github-webhook-activity>` | PR subscription events |
| `<persisted-output>` | Tool results saved to disk |

## Custom tags

Safe to define your own tags for prompt structure:

```
<repo>
  <branch>main</branch>
  <diff>
  ...
  </diff>
</repo>

Review the <diff> for issues.
```

Claude picks up on the structure without being told.

## Directives

- Don't invent tags that collide with system tags
  (`<system-reminder>` etc.) — the CLI may strip them.
- Use tags when giving Claude multiple distinct inputs
  (code + tests + error log); skip them when a single block of prose
  is already clear.
- For XML-structured **output**, prefer `output_config.format` JSON
  schema — it's enforced; tags are convention only.

## Source

Claude API prompt engineering guide; Claude Code system-reminder
conventions
