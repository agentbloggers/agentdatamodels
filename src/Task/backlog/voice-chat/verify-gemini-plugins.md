---
title: Verify + (maybe) wire jarrodwatts/claude-delegator + abiswas97/gemini-plugin-cc
status: deferred
opened: 2026-04-20
---

## why

The Gemini-plugins research pass surfaced two third-party Claude
Code plugins on GitHub:

- `jarrodwatts/claude-delegator` — "delegate tasks to Gemini
  directly from Claude Code".
- `abiswas97/gemini-plugin-cc` — "use Gemini from Claude Code to
  review code".

Neither is on an official marketplace. CLAUDE.md explicitly forbids
inventing plugin IDs, so we can't enable either without a verified
source, license check, and a review of what they execute under the
user's identity.

## scope

- In: fetch each repo's README + `.claude-plugin.json` / plugin
  manifest, verify the author, check the license, read the code it
  ships (hooks, agents, skills).
- In: if both check out, add a marketplace entry via
  `/plugin marketplace add <owner>/<repo>`, enable the plugin via
  repo `.claude/settings.json` (project-scope only — user-scope
  doesn't travel to cloud), and add an eval case that the plugin's
  slash command is discoverable.
- Out: shipping either plugin enabled-by-default if the review
  turns up anything that runs outside the repo directory or pulls
  network from non-Google domains.

## test recipe

```bash
/plugin marketplace list             # new entry visible
/plugin list                         # new plugin enabled
make eval-voice-chat                 # add a "slash command present" check
```

## blockers / open questions

- Are either of these repos archived or abandoned? If last commit
  is > 6 months old, skip.
- Does either tool send any prompt content to Gemini's API under
  its own key? We'd want explicit user-scope config, not a baked-in
  key in the plugin itself.
- Is there an Anthropic-maintained equivalent coming? Check the
  `anthropics/claude-code/plugins` directory before adding a
  third-party marketplace.
