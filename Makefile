.PHONY: help bootstrap-web install-web start-web stop-web lint-web fmt-web test-web doctor-web build-web graphql-web observe-up observe-down flow-run flow-news flow-score

# Default: show help
help:
	@awk 'BEGIN{FS=":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ----------------------------------------------------------------------
# bootstrap-web — one-shot setup for a claude-code-on-the-web env.
# Idempotent: safe to re-run.
# See /en/claude-code-on-the-web for the list of things preinstalled.
# ----------------------------------------------------------------------
bootstrap-web: ## Install system deps (gh, etc), start services, auth gh
	@echo "[bootstrap-web] installing gh"
	@if ! command -v gh >/dev/null 2>&1; then \
		apt-get update && apt-get install -y gh; \
	fi
	@echo "[bootstrap-web] verifying gh auth (expects \$$GH_TOKEN)"
	@if [ -z "$${GH_TOKEN:-}" ]; then \
		echo "WARN: GH_TOKEN not set. gh will be unauthenticated."; \
	else \
		gh auth status >/dev/null 2>&1 || echo "gh reads GH_TOKEN automatically — no login needed"; \
	fi
	@$(MAKE) start-web

# ----------------------------------------------------------------------
# install-web — project-level deps.
# Installs:
#   - npm deps from package.json (@octokit/graphql, markdown-it, …)
#   - Python deps (pyyaml) needed by .claude/scripts/*
# Idempotent. Safe to re-run.
# ----------------------------------------------------------------------
install-web: ## Install project-level deps (npm ci + pip)
	@if [ -f package.json ]; then \
		echo "[install-web] npm ci (package.json present)"; \
		if [ -f package-lock.json ]; then npm ci; else npm install; fi; \
	else \
		echo "[install-web] no package.json — skipping npm"; \
	fi
	@echo "[install-web] pyyaml for dep scripts"
	@python3 -c 'import yaml' 2>/dev/null || python3 -m pip install --quiet pyyaml

# ----------------------------------------------------------------------
# start-web — start the data plane (Phase C.6).
# Cloud (CLAUDE_CODE_REMOTE=true): uses baked-in system services.
# Local: uses docker compose where available.
# ----------------------------------------------------------------------
start-web: ## Start Postgres + Redis (cloud: system services; local: compose)
	@if [ "$${CLAUDE_CODE_REMOTE:-}" = "true" ]; then \
		echo "[start-web] cloud mode — starting system services"; \
		service postgresql start >/dev/null 2>&1 || sudo service postgresql start; \
		service redis-server start >/dev/null 2>&1 || sudo service redis-server start; \
	elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then \
		echo "[start-web] local mode — docker compose up -d postgres redis"; \
		docker compose up -d postgres redis; \
	else \
		echo "[start-web] no docker — falling back to system services"; \
		service postgresql start >/dev/null 2>&1 || sudo service postgresql start; \
		service redis-server start >/dev/null 2>&1 || sudo service redis-server start; \
	fi
	@$(MAKE) doctor-web

stop-web: ## Stop Postgres + Redis (cloud: system services; local: compose)
	@if [ "$${CLAUDE_CODE_REMOTE:-}" = "true" ]; then \
		service postgresql stop >/dev/null 2>&1 || sudo service postgresql stop; \
		service redis-server stop >/dev/null 2>&1 || sudo service redis-server stop; \
	elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then \
		docker compose down; \
	else \
		service postgresql stop >/dev/null 2>&1 || sudo service postgresql stop; \
		service redis-server stop >/dev/null 2>&1 || sudo service redis-server stop; \
	fi

observe-up: ## Start OTEL collector + Prometheus + Grafana (compose profile)
	@docker compose --profile observe up -d

observe-down: ## Stop observability stack
	@docker compose --profile observe down

# ----------------------------------------------------------------------
# lint-web — static checks over the repo.
# ----------------------------------------------------------------------
lint-web: ## Lint: markdown front-matter, yaml, jsx
	@echo "[lint-web] YAML frontmatter check for subagents"
	@for f in .claude/agents/*.md; do \
		case "$$(basename $$f)" in README.md) continue;; esac; \
		head -1 "$$f" | grep -q '^---$$' && \
			grep -q '^description:' "$$f" && \
			grep -q '^name:' "$$f" || \
			{ echo "  BAD: $$f"; exit 1; }; \
		echo "  ok  $$f"; \
	done
	@echo "[lint-web] mcp.json valid JSON"
	@python3 -c 'import json; json.load(open(".mcp.json"))' && echo "  ok  .mcp.json"
	@echo "[lint-web] settings.json valid JSON"
	@python3 -c 'import json; json.load(open(".claude/settings.json"))' && echo "  ok  .claude/settings.json"
	@echo "[lint-web] upstream-hashes.json valid JSON"
	@python3 -c 'import json; json.load(open("src/web/dependencies/upstream-hashes.json"))' && echo "  ok  upstream-hashes.json"
	@echo "[lint-web] manifest.yaml parses"
	@python3 -c 'import yaml; yaml.safe_load(open("src/web/dependencies/manifest.yaml"))' && echo "  ok  manifest.yaml"

# ----------------------------------------------------------------------
# fmt-web — format markdown + JSON in place.
# ----------------------------------------------------------------------
fmt-web: ## Format markdown + JSON (pretty-print)
	@echo "[fmt-web] pretty-printing JSON"
	@for f in .mcp.json .claude/settings.json src/web/dependencies/upstream-hashes.json; do \
		python3 -c "import json,sys; d=json.load(open('$$f')); open('$$f','w').write(json.dumps(d, indent=2)+'\n')" && \
			echo "  $$f"; \
	done

# ----------------------------------------------------------------------
# test-web — currently: smoke test of browsing the static site.
# ----------------------------------------------------------------------
test-web: ## Smoke test: serve index.html and fetch it
	@echo "[test-web] serving index.html on :8080 for 2s"
	@(python3 -m http.server 8080 >/dev/null 2>&1 & echo $$! > /tmp/httpd.pid; sleep 1; \
		curl -sf http://localhost:8080/ >/dev/null && echo "  ok  index.html loads" || echo "  FAIL"; \
		kill `cat /tmp/httpd.pid` 2>/dev/null; rm -f /tmp/httpd.pid)

# ----------------------------------------------------------------------
# doctor-web — are we healthy?
# Set DOCTOR_INCLUDE_GHE=1 to also exercise the GHE audit-log probe
# (requires admin:org / read:audit_log scope on GH_TOKEN).
# ----------------------------------------------------------------------
doctor-web: ## Health check: services, tools, enterprise auth
	@echo "[doctor-web] mode"
	@if [ "$${CLAUDE_CODE_REMOTE:-}" = "true" ]; then echo "  cloud"; else echo "  local"; fi
	@echo "[doctor-web] pg_isready"
	@pg_isready -h localhost -p 5432 2>&1 | sed 's/^/  /'
	@echo "[doctor-web] redis-cli ping"
	@redis-cli -h localhost -p 6379 ping 2>&1 | sed 's/^/  /'
	@echo "[doctor-web] gh installed?"
	@command -v gh >/dev/null 2>&1 && gh --version | head -1 | sed 's/^/  /' || echo "  gh: not installed"
	@echo "[doctor-web] gh authenticated? (D6)"
	@gh auth status >/dev/null 2>&1 && echo "  ok" || echo "  WARN: not authenticated — run /web-setup (cloud) or 'gh auth login' (local)"
	@echo "[doctor-web] CLAUDE_CODE_OAUTH_TOKEN present? (D4)"
	@if [ -n "$${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then echo "  ok (env)"; \
	elif command -v claude >/dev/null 2>&1 && claude config get authToken >/dev/null 2>&1; then echo "  ok (keychain via /login)"; \
	else echo "  WARN: no OAuth token — run /install-github-app then /web-setup"; fi
	@echo "[doctor-web] ANTHROPIC_API_KEY absent from committed files? (D4)"
	@if git grep -l ANTHROPIC_API_KEY -- ':!.claude/plans/' ':!src/web/prompt-evals/decisions/' ':!src/web/wellarchitected/' ':!src/web/enterprise/' >/dev/null 2>&1; then \
		echo "  FAIL: ANTHROPIC_API_KEY found in committed file — review and remove"; \
	else echo "  ok"; fi
	@echo "[doctor-web] pin coverage"
	@python3 -c "import json; d=json.load(open('src/web/dependencies/upstream-hashes.json')); print('  tracked:', len(d['pages']))"
	@echo "[doctor-web] claude --version"
	@command -v claude >/dev/null 2>&1 && claude --version | sed 's/^/  /' || echo "  claude: not on PATH"
	@echo "[doctor-web] session URL"
	@if [ -n "$${CLAUDE_CODE_REMOTE_SESSION_ID:-}" ]; then \
		echo "  https://claude.ai/code/$${CLAUDE_CODE_REMOTE_SESSION_ID}"; \
	else \
		echo "  (not in a cloud session — CLAUDE_CODE_REMOTE_SESSION_ID unset)"; \
	fi
	@if [ "$${DOCTOR_INCLUDE_GHE:-}" = "1" ]; then \
		echo "[doctor-web] GHE audit-log reachable? (D7)"; \
		gh api graphql -f query='{ organization(login:"agentbloggers") { auditLog(first:1) { nodes { ... on AuditEntry { action } } } } }' >/dev/null 2>&1 \
			&& echo "  ok — SSO-authorized PAT" \
			|| echo "  WARN: GHE audit-log probe failed (SSO not authorized, or GH_TOKEN lacks admin:org)"; \
	fi

# ----------------------------------------------------------------------
# build-web — static site needs no build, but this is a hook for later.
# ----------------------------------------------------------------------
build-web: ## Build artifacts (no-op today)
	@echo "[build-web] no build step — static React+Babel-standalone site"

# ----------------------------------------------------------------------
# graphql-web — refresh upstream hashes + GraphQL-query pinned repos.
# This is the control-plane target: it reads manifest.yaml, checks the
# SHA256 of each tracked page, runs GraphQL queries for each watched
# repo's latest release, and writes a report to .claude/graphql-runs/.
# ----------------------------------------------------------------------
graphql-web: ## Hash upstream docs + GraphQL-query pinned GitHub repos
	@bash .claude/scripts/track-upstream.sh
	@bash .claude/scripts/graphql-deps.sh

# ----------------------------------------------------------------------
# flow-news — fetch both claude-code CHANGELOG.md sources, hash them,
# and write the delta to .claude/graphql-runs/flow-news-<ts>.json.
# Consumed by flow-run. Safe to invoke on its own to check for new
# deltas without generating a video.
# ----------------------------------------------------------------------
flow-news: ## Fetch CHANGELOG sources + compute delta
	@bash .claude/scripts/flow-fetch-news.sh

# ----------------------------------------------------------------------
# flow-score — Opus 4.6 CODE stage. Reads the newest flow-news-*.json,
# scores each new CHANGELOG bullet against src/flow/news/emotion-rubric.md,
# and writes a .draft.json spec. The author reviews + renames to .json.
# ----------------------------------------------------------------------
flow-score: ## Opus 4.6 scores the latest CHANGELOG delta → draft spec
	@bash .claude/scripts/flow-score-news.sh

# ----------------------------------------------------------------------
# flow-run — full CEE loop for a Gemmah video.
# Usage: make flow-run SPEC=src/flow/pipelines/specs/<date>-<slug>.json
# Requires GEMINI_API_KEY + GOOGLE_DRIVE_FOLDER_ID in the env.
# Models: generate.sh uses Opus 4.6 for CODE dispatches; evaluate.sh
# uses Opus 4.7 for the vision rubric (see src/flow/README.md).
# ----------------------------------------------------------------------
flow-run: ## Full CEE loop for one Gemmah video spec (SPEC=path required)
	@if [ -z "$(SPEC)" ]; then \
		echo "usage: make flow-run SPEC=src/flow/pipelines/specs/<date>-<slug>.json"; exit 2; \
	fi
	@bash .claude/scripts/flow-fetch-news.sh
	@bash .claude/scripts/flow-generate.sh "$(SPEC)"
	@bash .claude/scripts/flow-evaluate.sh "$(SPEC)"
