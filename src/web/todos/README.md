# todos

The `TodoWrite` tool — structured task tracking per session.

## When to use

- Task requires **≥ 3 distinct steps**.
- User provided a **list** of things to do.
- Complex refactor or multi-file change.
- Long-running workflow where progress visibility matters to the
  user.

## When NOT to use

- Single trivial task (one file edit, one command).
- Informational question.
- Conversational turn.

## Shape

```typescript
TodoWrite({
  todos: [
    { content: "Fetch llms.txt", activeForm: "Fetching llms.txt", status: "in_progress" },
    { content: "Write subagent configs", activeForm: "Writing subagent configs", status: "pending" },
  ],
});
```

- `content` — imperative ("Write subagent configs")
- `activeForm` — present-continuous ("Writing subagent configs"),
  shown to the user while that todo is in-progress
- `status` — `pending` / `in_progress` / `completed`

## Rules

- Exactly **one** todo can be `in_progress` at a time.
- Mark `completed` immediately after finishing, not in batches.
- Keep titles specific and verifiable.
- Prune stale todos — if the plan changes, rewrite the list.

## Directives

- Update the list in **real time** as you work. Batched updates look
  like opaque "I did it all" claims.
- Don't use `TodoWrite` in `-p` (non-interactive) mode — the user
  can't see the list. Log progress to stdout/stderr instead.
- Never fake `completed` — if a test is failing or a step is
  half-done, keep it `in_progress` and add a new todo for the
  blocker.

## Source

`TodoWrite` tool spec (shown via `ToolSearch` in current session)
