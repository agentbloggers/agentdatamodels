// Benchmark fixtures for the Claude + Neon branching eval.
// All numbers are illustrative — they model the shape of results we'd expect.

const NEON_PAGES = [
  { slug: "/docs/extensions/pg-extensions", bytes: 41820, tokens: 9840, chunks: 12 },
  { slug: "/docs/extensions/pg_cron", bytes: 18200, tokens: 4210, chunks: 6 },
  { slug: "/docs/extensions/timescaledb", bytes: 22400, tokens: 5120, chunks: 7 },
  { slug: "/docs/extensions/pgvector", bytes: 31050, tokens: 7230, chunks: 9 },
  { slug: "/docs/guides/branching-intro", bytes: 14800, tokens: 3410, chunks: 5 },
  { slug: "/docs/guides/logical-replication-guide", bytes: 27600, tokens: 6340, chunks: 8 },
  { slug: "/docs/manage/roles", bytes: 11200, tokens: 2580, chunks: 4 },
  { slug: "/docs/introduction/scale-to-zero", bytes: 9800, tokens: 2260, chunks: 4 },
];

const CF_PAGES = [
  { slug: "/workers/runtime-apis/bindings", bytes: 24800, tokens: 5700, chunks: 7 },
  { slug: "/workers/platform/limits", bytes: 16400, tokens: 3770, chunks: 5 },
  { slug: "/d1/build-with-d1/query", bytes: 21300, tokens: 4910, chunks: 6 },
  { slug: "/r2/buckets/configure-buckets", bytes: 18900, tokens: 4360, chunks: 6 },
  { slug: "/pages/framework-guides/nextjs", bytes: 29400, tokens: 6780, chunks: 8 },
  { slug: "/queues/reference/queues-api", bytes: 12600, tokens: 2900, chunks: 4 },
  { slug: "/vectorize/reference/indexes", bytes: 19100, tokens: 4400, chunks: 6 },
  { slug: "/ai-gateway/providers", bytes: 14200, tokens: 3280, chunks: 5 },
];

const BRANCHES = [
  {
    id: "br-main",
    label: "main",
    parent: null,
    compute: "0.25 CU (scale-to-zero)",
    pg: "18",
    state: "idle",
    size_mb: 842,
    hot: false,
    note: "Parent branch. Holds fully embedded corpus from t-4h run.",
  },
  {
    id: "br-neon-warm",
    label: "eval/neon-warm",
    parent: "br-main",
    compute: "0.5 CU (warm)",
    pg: "18",
    state: "running",
    size_mb: 24,
    hot: true,
    note: "Copy-on-write from main. Warm compute, embeddings reused.",
  },
  {
    id: "br-neon-cold",
    label: "eval/neon-cold",
    parent: "br-main",
    compute: "0.25 CU (cold start)",
    pg: "18",
    state: "running",
    size_mb: 24,
    hot: false,
    note: "Cold boot: includes compute spin-up tax.",
  },
  {
    id: "br-cf-warm",
    label: "eval/cf-warm",
    parent: "br-main",
    compute: "0.5 CU (warm)",
    pg: "18",
    state: "running",
    size_mb: 19,
    hot: true,
    note: "Cloudflare corpus. Warm compute.",
  },
  {
    id: "br-cf-cold",
    label: "eval/cf-cold",
    parent: "br-main",
    compute: "0.25 CU (cold start)",
    pg: "18",
    state: "queued",
    size_mb: 19,
    hot: false,
    note: "Cloudflare corpus. Cold compute.",
  },
  {
    id: "br-combo-ts",
    label: "eval/combo-timescale",
    parent: "br-main",
    compute: "1 CU (warm)",
    pg: "18",
    state: "running",
    size_mb: 38,
    hot: true,
    note: "Both corpora on a TimescaleDB hypertable, partitioned by source.",
  },
];

const PLAYBOOKS = [
  {
    id: "isolated-subagents",
    label: "Isolated subagents × Neon branching",
    one_liner: "One ephemeral branch per subagent. Parent state untouched.",
    basis: "Neon guide: isolated-subagents-neon-branching",
    expected: {
      latency_ms_per_page: 2140,
      cost_usd_per_1k_pages: 0.42,
      branch_mem_mb: 24,
      parallelism: 8,
    },
    notes: [
      "Branches created in ~1.2s via copy-on-write; no data duplication.",
      "Each subagent writes to its own branch, so failures don't poison main.",
      "Destroy-on-finish keeps the experiment matrix cheap.",
    ],
  },
  {
    id: "mcp-neon",
    label: "Claude Code + Neon MCP server",
    one_liner: "Claude drives Neon entirely through MCP tool calls.",
    basis: "Neon guide: claude-code-mcp-neon",
    expected: {
      latency_ms_per_page: 2480,
      cost_usd_per_1k_pages: 0.46,
      branch_mem_mb: 24,
      parallelism: 4,
    },
    notes: [
      "MCP gives Claude typed access to branches, roles, SQL.",
      "Round-trips are higher than raw psql, trades speed for safety.",
      "Good baseline: what a developer on Claude Code would actually run.",
    ],
  },
  {
    id: "cron-loop",
    label: "/loop + pg_cron scheduled embedding",
    one_liner: "Claude Code /loop schedules pg_cron to embed new pages nightly.",
    basis: "Claude Code automation / scheduled tasks",
    expected: {
      latency_ms_per_page: 1820,
      cost_usd_per_1k_pages: 0.31,
      branch_mem_mb: 18,
      parallelism: 1,
    },
    notes: [
      "pg_cron requires a 24/7 compute (scale-to-zero disabled).",
      "Session-scoped /loop expires after 7 days; fine for smoke tests.",
      "Lowest per-page cost; highest standing compute.",
    ],
  },
  {
    id: "harvey-pattern",
    label: "Harvey-style: domain-grounded verifier loop",
    one_liner: "Draft → retrieve → critique with a domain judge. Adapted for docs.",
    basis: "Public Harvey × Claude customer story patterns",
    expected: {
      latency_ms_per_page: 3100,
      cost_usd_per_1k_pages: 0.68,
      branch_mem_mb: 30,
      parallelism: 4,
    },
    notes: [
      "Higher per-page cost, but recall@5 climbs on multi-step retrieval.",
      "Each page gets a 'cited-or-rejected' pass before commit to pgvector.",
      "Useful when doc pages contain tables / version matrices (like PG extensions).",
    ],
  },
  {
    id: "legora-pattern",
    label: "Legora-style: parallel branches, merge on agreement",
    one_liner: "Race N subagents on isolated branches; keep the consensus chunking.",
    basis: "Public Legora × Claude customer story patterns",
    expected: {
      latency_ms_per_page: 2260,
      cost_usd_per_1k_pages: 0.58,
      branch_mem_mb: 24,
      parallelism: 6,
    },
    notes: [
      "Chunk boundaries are voted across 3 subagents; disagreement flagged.",
      "Cost scales with N; quality gain flattens after 3 voters.",
      "Pairs well with Neon branching: each voter on its own branch.",
    ],
  },
];

// Synthetic per-page run telemetry.
// Fields are chosen to be easy to chart: hash ms, embed ms, insert ms, tokens, cost.
function makeRuns(pages, seed) {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return pages.map((p, i) => {
    const hash_ms = 3 + rnd() * 5;
    const embed_ms = 180 + p.tokens * 0.06 + rnd() * 120;
    const insert_ms = 8 + rnd() * 14;
    const total_ms = hash_ms + embed_ms + insert_ms;
    const cost = (p.tokens / 1000) * 0.00013 + 0.00004;
    return {
      idx: i,
      slug: p.slug,
      tokens: p.tokens,
      chunks: p.chunks,
      hash_ms: +hash_ms.toFixed(1),
      embed_ms: +embed_ms.toFixed(1),
      insert_ms: +insert_ms.toFixed(1),
      total_ms: +total_ms.toFixed(1),
      cost_usd: +cost.toFixed(5),
      hash: "0x" + Math.floor(rnd() * 0xffffffff).toString(16).padStart(8, "0"),
    };
  });
}

const EVAL_SPEC = {
  name: "claude-code × neon-pg18 × timescale — doc embedding bench",
  version: "0.3.0-rc",
  objective:
    "Measure wall-clock latency, token cost, and per-branch memory footprint for Claude-Code-driven page hashing + embedding across isolated Neon branches.",
  targets: {
    p50_ms_per_page: 2500,
    p95_ms_per_page: 5000,
    usd_per_1k_pages: 0.5,
    recall_at_5: 0.85,
  },
  corpora: [
    { name: "neon-docs", source: "github.com/neondatabase/website", pages: 812 },
    { name: "cloudflare-docs", source: "github.com/cloudflare/cloudflare-docs", pages: 2140 },
  ],
  dimensions: [
    "branch_compute (0.25 | 0.5 | 1 CU)",
    "branch_state (warm | cold)",
    "embedding (pgvector+voyage | pgrag bge-small | lancedb-external)",
    "agent_pattern (isolated-subagents | mcp | loop+cron | harvey | legora)",
  ],
  judges: [
    "structural: every page yields ≥1 chunk, ≥1 embedding, 1 sha256",
    "retrieval: recall@5 on a held-out set of 120 query→gold-page pairs",
    "economic: $ per 1k pages and p95 ms per page within target",
  ],
};

Object.assign(window, {
  NEON_PAGES,
  CF_PAGES,
  BRANCHES,
  PLAYBOOKS,
  EVAL_SPEC,
  makeRuns,
});
