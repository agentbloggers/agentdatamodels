-- sql/bootstrap.sql — idempotent Phase C.5 schema.
--
-- Loaded into fresh Postgres containers via the compose
-- docker-entrypoint-initdb.d/ hook. Also re-runnable by hand via
-- `psql "$DATABASE_URL" -f sql/bootstrap.sql` — every statement
-- uses IF NOT EXISTS guards.
--
-- Three tables:
--   manifest_snapshots   — every make graphql-web run appends here
--                          (WA NIST SSDF RV.1 audit-log streaming pattern)
--   change_sets          — CHG-XXXX cross-repo change-set tracking
--                          (WA Polyrepo Engineering)
--   otel_tool_results    — tool_use / tool_result events from
--                          monitoring-usage.md stream-json output
--                          (WA NIST SSDF RV.1 + D11 stream-idle-timeout)

BEGIN;

CREATE TABLE IF NOT EXISTS manifest_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  url             TEXT        NOT NULL,
  sha256          TEXT        NOT NULL,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_path   TEXT,
  run_id          TEXT        NOT NULL,
  session_id      TEXT,
  UNIQUE (url, sha256)
);
CREATE INDEX IF NOT EXISTS manifest_snapshots_url_fetched_at_idx
  ON manifest_snapshots (url, fetched_at DESC);

CREATE TABLE IF NOT EXISTS change_sets (
  id              TEXT        PRIMARY KEY,          -- e.g. CHG-1042
  title           TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  owner_login     TEXT,
  sibling_repos   TEXT[]      NOT NULL DEFAULT '{}',
  session_id      TEXT,
  CHECK (status IN ('open','merged','closed','abandoned'))
);
CREATE INDEX IF NOT EXISTS change_sets_status_idx ON change_sets (status);

CREATE TABLE IF NOT EXISTS otel_tool_results (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT        NOT NULL,
  prompt_id       TEXT,
  tool_name       TEXT        NOT NULL,
  tool_use_id     TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms     INTEGER,
  status          TEXT        NOT NULL,       -- ok | error | timeout
  error_message   TEXT,
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  trace_parent    TEXT,
  CHECK (status IN ('ok','error','timeout'))
);
CREATE INDEX IF NOT EXISTS otel_tool_results_session_started_idx
  ON otel_tool_results (session_id, started_at DESC);
CREATE INDEX IF NOT EXISTS otel_tool_results_status_idx
  ON otel_tool_results (status) WHERE status <> 'ok';

COMMIT;
