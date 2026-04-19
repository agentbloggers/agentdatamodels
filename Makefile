.PHONY: help bootstrap-web install-web start-web stop-web lint-web fmt-web test-web doctor-web build-web graphql-web

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
# install-web — project-level deps (none today; reserved for when we add
# package.json or requirements.txt).
# ----------------------------------------------------------------------
install-web: ## Install project-level deps (npm, pip, etc)
	@echo "[install-web] nothing to install — this is a static site"
	@# Future: npm ci / pip install -r requirements.txt / etc.

# ----------------------------------------------------------------------
# start-web — start Postgres + Redis + Docker-backed services.
# In claude-code-on-the-web these are pre-installed but not running.
# ----------------------------------------------------------------------
start-web: ## Start Postgres, Redis, and docker services
	@echo "[start-web] starting postgresql"
	@service postgresql start >/dev/null 2>&1 || sudo service postgresql start
	@echo "[start-web] starting redis-server"
	@service redis-server start >/dev/null 2>&1 || sudo service redis-server start
	@echo "[start-web] checking docker"
	@if command -v docker >/dev/null 2>&1; then \
		docker info >/dev/null 2>&1 && echo "docker: ok" || echo "docker: daemon not running (ok in web env until used)"; \
	else \
		echo "docker: not installed (skip)"; \
	fi
	@$(MAKE) doctor-web

stop-web: ## Stop Postgres and Redis
	@service postgresql stop >/dev/null 2>&1 || sudo service postgresql stop
	@service redis-server stop >/dev/null 2>&1 || sudo service redis-server stop

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
# ----------------------------------------------------------------------
doctor-web: ## Health check: services running, tools installed
	@echo "[doctor-web] pg_isready"
	@pg_isready 2>&1 | sed 's/^/  /'
	@echo "[doctor-web] redis-cli ping"
	@redis-cli ping 2>&1 | sed 's/^/  /'
	@echo "[doctor-web] gh installed?"
	@command -v gh >/dev/null 2>&1 && gh --version | head -1 | sed 's/^/  /' || echo "  gh: not installed"
	@echo "[doctor-web] gh authenticated?"
	@gh auth status >/dev/null 2>&1 && echo "  ok" || echo "  not authenticated (set GH_TOKEN)"
	@echo "[doctor-web] claude --version"
	@command -v claude >/dev/null 2>&1 && claude --version | sed 's/^/  /' || echo "  claude: not on PATH"
	@echo "[doctor-web] session URL"
	@if [ -n "$${CLAUDE_CODE_REMOTE_SESSION_ID:-}" ]; then \
		echo "  https://claude.ai/code/$${CLAUDE_CODE_REMOTE_SESSION_ID}"; \
	else \
		echo "  (not in a cloud session — CLAUDE_CODE_REMOTE_SESSION_ID unset)"; \
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
