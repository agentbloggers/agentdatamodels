# visionagents.ai — reference card

Python-first orchestration stack that composes STT + LLM + TTS +
Avatar on the getstream.io edge network. Useful to know even if
`voice-chat/` is a browser demo: when we want a *server-side* live
agent (e.g. a Routine that dials into a meeting), this is the path.

## Exact names

| Thing | Value |
|---|---|
| Project site | `https://visionagents.ai/` |
| Anam plugin doc | `https://visionagents.ai/integrations/avatars/anam` |
| PyPI package | `vision-agents` |
| Install | `pip install vision-agents` |
| Vendor | Stream (`getstream.io`) — same company behind the Chat / Video SDKs |
| Edge transport | getstream.io realtime edge |

<!-- unverified: visionagents.ai and docs.anam.ai pages were 503 at
     2026-04-20 fetch; update exact class names when reachable. -->

## Composition pattern

The library's selling point is a tight loop where each component
is swappable:

```python
from vision_agents.core import Agent
from vision_agents.plugins import openai, deepgram, elevenlabs, anam

agent = Agent(
    stt=deepgram.STT(),
    llm=openai.LLM(model="gpt-4.1-mini"),
    tts=elevenlabs.TTS(voice="Rachel"),
    avatar=anam.Avatar(persona_id="…"),
)

await agent.join(call_id="demo-room")
```

You can drop Claude in as the `llm` layer — the SDK exposes a
`create_message` shim for Anthropic. Pair it with `claude-opus-4-7`
and set `output_config.effort="high"` for the model-thinking calls.

## Why you might run it server-side

- A Routine fires on a schedule, dials an avatar into a getstream
  room, and does the "code-execute-evaluate" loop against your
  repo. The browser never has to be open.
- Heavy tools live in Python (numpy, pandas, `psycopg`) — wiring
  them up is cleaner than shipping everything through a browser
  sandbox.
- You want to record the session server-side without trusting the
  user's local disk.

## Why `voice-chat/` still uses the JS path

- Browser demo is the most visible surface.
- Gemini Live is a better fit for low-latency barge-in than
  STT-plus-LLM-plus-TTS stacks today.
- No getstream.io room provisioning for a single-user toy demo.

If the demo grows up into a multi-user meeting surface, the Python
stack above is the replacement path. Document the migration in this
file at that time.
