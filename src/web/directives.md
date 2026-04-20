# Directives

Rules of conduct per context. Imperative, not descriptive.

## In a Claude Code on the web (cloud) session

- Assume **no local config**. User-level `~/.claude/*` does not load.
  The repo clone is the only source of truth.
- Default network is `Trusted` — allowlisted package registries + GitHub
  + cloud SDKs. Don't assume arbitrary outbound calls succeed.
- Commit everything the cloud must see:
  - MCP servers → `.mcp.json`
  - Plugins → repo `.claude/settings.json` under `enabledPlugins`
  - Skills/agents/rules → `.claude/{skills,agents,rules}/`
- Stamp artifacts with a link back to the run:
  `https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID}`. Put it in
  PR bodies, commit footers, Slack messages.
- Routines and other session-level automations can only push to
  `claude/`-prefixed branches by default. Turn on **Allow unrestricted
  branch pushes** per repo on the routine if you need otherwise.
- Interactive-picker commands don't work in cloud: no `/model`,
  `/config`, `/plugin`, `/mcp`, `/resume`, `/clear`. Text-output
  commands (`/compact`, `/context`, `/cost`, `/recap`, etc.) do work.
- Services (Postgres, Redis) are pre-installed but not running —
  start them per session or via a `SessionStart` hook. The
  environment cache captures files, not processes.

## Driving a local session via Remote Control

- The local `claude` process must stay alive. ~10 min unreachable =
  the RC session times out.
- Local-only commands (run them at the local CLI, not from web/mobile):
  `/mcp`, `/plugin`, `/resume`.
- Commands that produce text output (`/compact`, `/context`, `/clear`,
  `/cost`, `/exit`, `/extra-usage`, `/recap`, `/reload-plugins`) work
  from anywhere.
- `/ultraplan` disconnects RC — both features occupy the
  `claude.ai/code` surface and only one can be connected at a time.
  Ultrareview is fine because it runs in a background cloud sandbox.
- `claude remote-control` server mode defaults to `--spawn same-dir`
  (all sessions share cwd — can conflict on edits). Press `w` at
  runtime to toggle to `--spawn worktree` when parallel work could
  collide.
- Server mode rejects extra connections with `--spawn session`.
- Mobile push on `Push when Claude decides` requires the Claude app
  installed and Remote Control active.

## Moving sessions

- `claude --remote <prompt>` → **new** cloud session from the current
  repo's GitHub remote at the current branch. Push local commits
  first; the VM clones from GitHub, not your machine.
- `claude --teleport [id]` / `/teleport` → **pull a cloud session down**.
  Requires: clean git state, same repo (not a fork), branch already
  pushed, same claude.ai account.
- Handoff from CLI is one-way (web → terminal). To push a local
  terminal session to the web, use the Desktop app's **Continue in…**
  menu.
- `CCR_FORCE_BUNDLE=1 claude --remote …` bundles the local repo and
  uploads it — use when the repo isn't on GitHub. Bundle must be
  ≤ 100 MB (falls back to current-branch-only, then to squashed
  working-tree snapshot).

## Ultraplan

- Three launch paths: `/ultraplan <prompt>`, the keyword
  `ultraplan` in any prompt, or **Refine with Ultraplan** on a local
  plan-mode result.
- CLI shows `◇ ultraplan → ◇ ultraplan needs your input → ◆ ultraplan
  ready`. Click through from `/tasks` to watch it.
- Three execution options from the browser: **execute on web**,
  **teleport back to terminal** (local options: implement here / start
  new session / cancel + save plan to file), or **stop** (archives the
  cloud session, nothing saved locally).

## Ultrareview

- Only launches on explicit `/ultrareview` — never start one
  unprompted.
- Pro/Max accounts get 3 free runs, one-time; after that, billed as
  extra usage (~$5-20 per review). Extra usage must be enabled first.
- Team/Enterprise: always billed as extra usage.
- Not available on Bedrock, Vertex AI, Microsoft Foundry, or ZDR-enabled
  organizations.
- Session bundles either the local branch diff vs. default, or a PR by
  number. If the repo is too large to bundle, push a draft PR and use
  PR mode.
- Running in the background — keep working. Findings return as
  notifications.

## Routines

- Prompts run **autonomously** — no approval dialogs mid-run. Make the
  prompt self-contained about what to do and what success looks like.
- Triggers combine: one routine can have a schedule + a GitHub event
  subscription + an API endpoint.
- `/fire` API uses a **dated beta header**
  (`experimental-cc-routine-2026-04-01`). Breaking changes ship behind
  a new dated header; the two prior headers keep working during
  migration.
- Routines belong to your individual account — they're not shared.
  Connector actions and GitHub operations happen under **your**
  identity.
- Default branch-push rule: only `claude/`-prefixed branches. Flip
  **Allow unrestricted branch pushes** per repo when the routine
  needs to touch a named feature branch.
- Per-routine + per-account hourly GitHub-webhook caps apply during
  research preview. Excess events are dropped until the window resets.

## Auto-fix PRs

- Enable via `/autofix-pr` (on the PR's branch), the CI-status bar's
  **Auto-fix** action, a mobile prompt, or by pasting the PR URL into
  a session and asking.
- Requires the Claude GitHub App installed on the repo.
- Claude may comment on PR review threads **under the user's GitHub
  identity** — reviewers see the comment labeled as Claude Code. Watch
  for `issue_comment`-triggered automation (Atlantis, Terraform Cloud,
  custom Actions) in repos where a PR comment can deploy infra.

## Dispatch (mobile → Desktop)

- Pair the Claude mobile app with the Desktop app. Dispatch a task
  from the phone and it spawns a Desktop session on your Mac.
- Minimal setup, but Desktop must be installed and paired. Not the
  right tool for remote/cloud work — for that use Routines, Remote
  Control, or a prefilled `claude.ai/code` URL.

## Scheduled tasks (CLI / Desktop / cloud)

- `/loop <interval> <command>` inside a live CLI session — in-session
  scheduler, expires after ~7 days, good for smoke tests.
- Desktop scheduled tasks — local, access to local files, runs on your
  machine.
- Cloud Routines — hosted; pick this when work should continue when
  your laptop is closed.

## Headless / `claude -p` (CI + scripts)

- Use `--bare` for deterministic runs. Bare skips hook/skill/plugin/MCP/
  memory/`CLAUDE.md` auto-discovery; reintroduce only what the script
  needs via `--settings`, `--mcp-config`, `--agents`, `--plugin-dir`,
  `--append-system-prompt[-file]`.
- Bare skips OAuth — auth via `ANTHROPIC_API_KEY` or an `apiKeyHelper`
  in `--settings`.
- `--permission-mode dontAsk` denies anything outside
  `permissions.allow` or the read-only command set. That's the right
  default for locked-down CI.
- Only built-in commands that emit text work in `-p` (no `/commit`,
  `/plan`, `/plugin`, `/mcp`, `/resume`). Describe the task instead.
- Stream-JSON output produces `system/init` first; if `plugins` or
  `plugin_errors` is set, check `plugin_errors` and fail CI when it's
  non-empty.

## Plugins

- Install from `anthropics/claude-code` (add once with
  `/plugin marketplace add anthropics/claude-code`) or the always-on
  `claude-plugins-official` marketplace.
- Only **project scope** (`enabledPlugins` in repo `.claude/settings.json`)
  propagates to cloud sessions. User / local / managed scopes don't.
- Trust matters. Plugins execute arbitrary code under your user.

## Model defaults

- Default to `claude-opus-4-7` for any new Claude API / Agent SDK
  code.
- Use `thinking: {type: "adaptive"}` on Opus 4.7 / 4.6 / Sonnet 4.6.
  `budget_tokens`, `temperature`, `top_p`, `top_k` are removed on
  Opus 4.7 (400 error if passed) and deprecated on 4.6.
- Never date-suffix model IDs
  (`claude-sonnet-4-5`, never `claude-sonnet-4-5-20250514`).
- Agent SDK floor for Opus 4.7: v0.2.111+.

## Do not

- Do not commit secrets to the repo as a workaround for cloud envs
  not having a secret store. Put them in the cloud env's environment
  variables; they're visible to anyone who can edit the env, but
  they're not in git.
- Do not generate URLs you haven't verified exist.
- Do not invent plugin IDs, marketplace names, slash commands, or beta
  headers — if it's not in `primitives.md`, either check `sources.md`
  or WebFetch the live doc.
