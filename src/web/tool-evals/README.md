# tool-evals

Evaluating custom tools (MCP or SDK-defined) for correctness and
Claude's ability to use them.

## Two failure modes to check

1. **Tool contract failure** — tool crashes, returns malformed data,
   or takes too long.
2. **Tool selection failure** — Claude has the right tool but picks
   the wrong one or forgets to call it.

## Harness

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { promises as fs } from "fs";

const cases = JSON.parse(await fs.readFile("evals.json", "utf8"));

for (const c of cases) {
  const toolCalls: any[] = [];
  for await (const msg of query({
    prompt: c.prompt,
    options: { allowedTools: [...c.tools, "Agent"] },
  })) {
    if ((msg as any).message?.content) {
      for (const block of (msg as any).message.content) {
        if (block.type === "tool_use") toolCalls.push(block);
      }
    }
  }
  console.log(c.id, "calls:", toolCalls.map(t => t.name));
}
```

## Metrics

| Metric | Target |
|---|---|
| Tool selection accuracy | Right tool called for each case |
| Correct argument | `tool_input` matches expected schema |
| Fallback behavior | When tool fails, Claude retries or asks, doesn't loop |
| Latency | Tool call < 2s p95 for interactive UX |

## Tool description quality

Anthropic's cookbook `tool_evaluation/` has a framework for scoring
tool descriptions. Rule of thumb:

- Start with an action verb
- Include **when to use it** and **when not to**
- List parameter constraints in the schema, not the description

## Directives

- Tool names are a namespace. Don't ship two tools with prefix
  collisions — Claude gets confused.
- `inputSchema` tightness matters more than description length.
  A strict schema constrains Claude; prose doesn't.
- For tool use + thinking together on Opus 4.7, ensure
  `thinking: {type: "adaptive"}` is set.

## Source

`/en/tools-reference`, `claude-cookbooks/tool_evaluation/`,
`/en/agent-sdk/custom-tools`
