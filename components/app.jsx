const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;

function App() {
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "pg": "18",
    "embedding": "pgvector+voyage",
    "corpus": "both",
    "branchCount": 5,
    "playbook": "isolated-subagents"
  }/*EDITMODE-END*/;

  const [tweaks, setTweaks] = uS(TWEAKS);
  const [tweaksVisible, setTweaksVisible] = uS(false);
  const [activeBranch, setActiveBranch] = uS("br-neon-warm");
  const [activePlaybook, setActivePlaybook] = uS(TWEAKS.playbook);
  const [runCorpus, setRunCorpus] = uS("neon");
  const [activeRunIdx, setActiveRunIdx] = uS(0);
  const [streamLines, setStreamLines] = uS([]);
  const [running, setRunning] = uS(false);

  uE(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setTweaksVisible(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaksVisible(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const updateTweaks = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  };

  const pages = runCorpus === "neon" ? NEON_PAGES : CF_PAGES;
  const runs = uM(() => makeRuns(pages, runCorpus === "neon" ? 42 : 99), [runCorpus]);
  const activeRun = runs[activeRunIdx];

  // aggregate
  const totals = uM(() => {
    const sum = runs.reduce(
      (a, r) => ({
        ms: a.ms + r.total_ms,
        cost: a.cost + r.cost_usd,
        tokens: a.tokens + r.tokens,
        chunks: a.chunks + r.chunks,
      }),
      { ms: 0, cost: 0, tokens: 0, chunks: 0 }
    );
    const p50 = [...runs].sort((a, b) => a.total_ms - b.total_ms)[Math.floor(runs.length / 2)].total_ms;
    const p95 = [...runs].sort((a, b) => a.total_ms - b.total_ms)[Math.floor(runs.length * 0.95)].total_ms;
    return { ...sum, p50, p95 };
  }, [runs]);

  // simulated streaming run
  const startRun = () => {
    setRunning(true);
    setStreamLines([]);
    const pb = PLAYBOOKS.find((p) => p.id === activePlaybook);
    const seq = [
      { text: `$ claude --playbook ${activePlaybook}`, color: "oklch(0.70 0.15 70)" },
      { text: `→ connecting to neon via MCP (project: agentkw)` },
      { text: `→ pg_version=${tweaks.pg}   extensions: timescaledb, pgvector, pg_cron` },
      { text: `→ creating branch 'eval/${runCorpus}-${Date.now().toString().slice(-5)}' from main` },
      { text: `  branch ready in 1,184ms   cow-size: 24MB`, color: "oklch(0.55 0.15 260)" },
      { text: `→ CREATE EXTENSION IF NOT EXISTS vector;` },
      { text: `→ CREATE EXTENSION IF NOT EXISTS timescaledb;` },
      { text: `→ SELECT create_hypertable('doc_embed','ts', if_not_exists=>true);` },
      { text: `` },
      { text: `# embedding ${pages.length} pages (${pb.label})`, color: "oklch(0.70 0.15 70)" },
    ];
    runs.forEach((r, i) => {
      seq.push({
        text: `[${String(i + 1).padStart(3, "0")}/${runs.length}] ${r.slug.padEnd(42)} sha=${r.hash} t=${r.total_ms.toFixed(0)}ms  $${r.cost_usd.toFixed(5)}`,
      });
    });
    seq.push({ text: `` });
    seq.push({ text: `✓ ${runs.length} pages · ${totals.chunks} chunks · ${totals.tokens.toLocaleString()} tokens`, color: "oklch(0.55 0.15 260)" });
    seq.push({ text: `  p50=${totals.p50.toFixed(0)}ms  p95=${totals.p95.toFixed(0)}ms  $${totals.cost.toFixed(4)}`, color: "oklch(0.55 0.15 260)" });

    let i = 0;
    const iv = setInterval(() => {
      if (i >= seq.length) {
        clearInterval(iv);
        setRunning(false);
        return;
      }
      const t = new Date().toISOString().slice(11, 19);
      setStreamLines((ls) => [...ls, { ...seq[i], t }]);
      i++;
    }, 70);
  };

  const activePB = PLAYBOOKS.find((p) => p.id === activePlaybook);
  const activeBranchObj = BRANCHES.find((b) => b.id === activeBranch);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 36px 80px" }}>
      {/* header */}
      <div
        data-screen-label="00 Header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1a1a1a", paddingBottom: 20 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#6a665d" }}>
              bench · v{EVAL_SPEC.version}
            </div>
            <Tag tone="ghost">draft</Tag>
          </div>
          <h1 style={{ fontFamily: "var(--sans)", fontSize: 34, fontWeight: 500, letterSpacing: -0.6, margin: "8px 0 6px", maxWidth: 760 }}>
            Measuring Claude Code on Neon PG18 + TimescaleDB —
            <span style={{ color: "#6a665d" }}> hash + embed per page across isolated branches.</span>
          </h1>
          <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "#55514a", maxWidth: 760 }}>
            An eval that stress-tests branch creation latency, per-branch memory, and $/1k-pages for
            Claude-Code-driven crawling of Neon + Cloudflare docs. Playbooks informed by public
            material on how legal-AI teams run multi-agent retrieval.
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 11, color: "#55514a" }}>
          <div>{new Date().toISOString().slice(0, 10)}</div>
          <div style={{ marginTop: 4 }}>corpora: {EVAL_SPEC.corpora.reduce((a, c) => a + c.pages, 0).toLocaleString()} pages</div>
          <div>branches: {BRANCHES.length}</div>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Dot color="oklch(0.55 0.15 260)" pulse /> 3 running
            </span>
          </div>
        </div>
      </div>

      {/* big metrics */}
      <div data-screen-label="01 Headline metrics" style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <BigMetric label="p50 latency / page" value={totals.p50.toFixed(0)} unit="ms" delta="-14%" note="hash + embed + insert" />
        <BigMetric label="p95 latency / page" value={totals.p95.toFixed(0)} unit="ms" delta="-8%" note="worst 5% of pages" />
        <BigMetric label="$ / 1,000 pages" value={((totals.cost / runs.length) * 1000).toFixed(3)} unit="usd" delta="-22%" note="embed api + neon cu-min" />
        <BigMetric label="branch overhead" value={activeBranchObj.size_mb} unit="mb" note="copy-on-write from main" />
        <BigMetric label="recall @5" value="0.87" unit="" delta="+0.04" note="vs held-out gold set" />
      </div>

      {/* section 2 */}
      <div style={{ marginTop: 48 }}>
        <SectionHead n="02" title="Agent playbook under test" subtitle="Pick a pattern — each runs a different strategy for crawling, hashing, and embedding a doc page. Expected numbers are priors; the benchmark updates them." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {PLAYBOOKS.map((pb) => (
            <PlaybookCard key={pb.id} pb={pb} active={pb.id === activePlaybook} onPick={setActivePlaybook} />
          ))}
        </div>
        <div style={{ marginTop: 14, padding: 14, background: "#ece8df", border: "1px solid #1a1a1a" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", textTransform: "uppercase", letterSpacing: 0.6 }}>
            notes · {activePB.label}
          </div>
          <ul style={{ fontFamily: "var(--sans)", fontSize: 13, margin: "6px 0 0", paddingLeft: 18, color: "#1a1a1a", lineHeight: 1.6 }}>
            {activePB.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      </div>

      {/* section 3 - branches */}
      <div style={{ marginTop: 48 }}>
        <SectionHead n="03" title="Branch topology" subtitle="Each subagent gets an isolated Neon branch (copy-on-write from main). Click a node to inspect." />
        <div style={{ border: "1px solid #1a1a1a", padding: "8px 12px", background: "#f5f3ee" }}>
          <BranchGraph branches={BRANCHES} activeId={activeBranch} onPick={setActiveBranch} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginTop: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #1a1a1a" }}>
            <thead>
              <tr style={{ background: "#1a1a1a", color: "#f5f3ee" }}>
                {["branch", "parent", "compute", "pg", "size", "state"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRANCHES.map((b) => (
                <BranchRow key={b.id} b={b} active={b.id === activeBranch} onPick={setActiveBranch} />
              ))}
            </tbody>
          </table>
          <div style={{ border: "1px solid #1a1a1a", padding: 14, background: "#f5f3ee" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", textTransform: "uppercase", letterSpacing: 0.6 }}>
              branch · {activeBranchObj.label}
            </div>
            <h3 style={{ fontFamily: "var(--sans)", fontSize: 18, fontWeight: 500, margin: "4px 0 10px" }}>
              {activeBranchObj.state === "running" ? "Actively embedding." : activeBranchObj.state === "queued" ? "Waiting on cold start." : "Idle."}
            </h3>
            <KV k="parent" v={activeBranchObj.parent || "— (root)"} />
            <KV k="compute" v={activeBranchObj.compute} />
            <KV k="postgres" v={`PG${activeBranchObj.pg}`} />
            <KV k="extensions" v="timescaledb, pgvector, pg_cron, pgcrypto" />
            <KV k="branch size" v={`${activeBranchObj.size_mb} MB (CoW)`} />
            <KV k="compute hot?" v={activeBranchObj.hot ? "yes" : "no — incl. cold start"} />
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "#55514a", marginTop: 10, paddingTop: 10, borderTop: "1px solid #d9d4c8" }}>
              {activeBranchObj.note}
            </div>
          </div>
        </div>
      </div>

      {/* section 4 - per page */}
      <div style={{ marginTop: 48 }}>
        <SectionHead n="04" title="Per-page telemetry" subtitle="For every page: SHA-256 hash, token count, chunk count, embed latency, insert latency, total wall-clock, Claude cost." />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["neon", "cloudflare"].map((c) => (
            <button
              key={c}
              onClick={() => { setRunCorpus(c); setActiveRunIdx(0); }}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                padding: "6px 12px",
                background: runCorpus === c ? "#1a1a1a" : "transparent",
                color: runCorpus === c ? "#f5f3ee" : "#1a1a1a",
                border: "1px solid #1a1a1a",
                cursor: "pointer",
              }}
            >
              {c === "neon" ? "neon docs" : "cloudflare docs"} · {c === "neon" ? NEON_PAGES.length : CF_PAGES.length}p
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={startRun}
            disabled={running}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              padding: "6px 14px",
              background: running ? "#6a665d" : "oklch(0.55 0.15 260)",
              color: "#f5f3ee",
              border: "1px solid #1a1a1a",
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? "streaming…" : "▶ run eval (simulated)"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #1a1a1a", maxHeight: 420, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0 }}>
                <tr style={{ background: "#1a1a1a", color: "#f5f3ee" }}>
                  {["#", "page", "tokens", "chunks", "hash ms", "embed ms", "total ms", "cost", "sha256"].map((h, i) => (
                    <th key={h} style={{
                      padding: "8px 12px",
                      textAlign: i >= 2 && i <= 7 ? "right" : "left",
                      fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <DocPageRow key={i} run={r} active={i === activeRunIdx} onClick={() => setActiveRunIdx(i)} />
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <StreamLog lines={streamLines.length ? streamLines : [
              { t: "—", text: "# press '▶ run eval' to stream a simulated crawl.", color: "#6a665d" },
              { t: "—", text: "# this mocks the tool trace Claude Code would emit via the neon MCP.", color: "#6a665d" },
            ]} height={420} />
          </div>
        </div>

        {/* bars */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #1a1a1a", padding: 14 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              latency / page (ms)
            </div>
            <Bars rows={runs} xKey="slug" yKey="total_ms" format={(v) => v.toFixed(0)} color="#1a1a1a" />
          </div>
          <div style={{ border: "1px solid #1a1a1a", padding: 14 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              cost / page (usd)
            </div>
            <Bars rows={runs} xKey="slug" yKey="cost_usd" format={(v) => "$" + v.toFixed(4)} color="oklch(0.55 0.15 260)" />
          </div>
        </div>
      </div>

      {/* section 5 - spec */}
      <div style={{ marginTop: 48 }}>
        <SectionHead n="05" title="Eval spec" subtitle="The contract the benchmark enforces. Judges are run per-branch per-page." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #1a1a1a", padding: 16, background: "#f5f3ee" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              targets
            </div>
            {Object.entries(EVAL_SPEC.targets).map(([k, v]) => (
              <KV key={k} k={k} v={typeof v === "number" ? v.toLocaleString() : v} />
            ))}
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", textTransform: "uppercase", letterSpacing: 0.6, margin: "14px 0 8px" }}>
              dimensions swept
            </div>
            {EVAL_SPEC.dimensions.map((d, i) => (
              <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#1a1a1a", lineHeight: 1.7 }}>· {d}</div>
            ))}
          </div>
          <div style={{ border: "1px solid #1a1a1a", padding: 16, background: "#1a1a1a", color: "#f5f3ee" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "oklch(0.70 0.15 70)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
              judges
            </div>
            {EVAL_SPEC.judges.map((j, i) => (
              <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.8, paddingLeft: 14, textIndent: -14 }}>
                <span style={{ color: "oklch(0.70 0.15 70)" }}>✓</span> {j}
              </div>
            ))}
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#a8a195", marginTop: 20, paddingTop: 14, borderTop: "1px solid #3a362d" }}>
              objective
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "#f5f3ee", marginTop: 4, lineHeight: 1.5 }}>
              {EVAL_SPEC.objective}
            </div>
          </div>
        </div>
      </div>

      {/* section 6 - how legal-ai teams run this */}
      <div style={{ marginTop: 48 }}>
        <SectionHead n="06" title="Prior art — how legal-AI teams use Claude" subtitle="Based on public customer-story material. These informed the two playbooks in section 02." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: "1px solid #1a1a1a", padding: 16, background: "#f5f3ee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 500 }}>Verifier-loop pattern</div>
              <Tag tone="paper">legal-ai co. A</Tag>
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "#55514a", lineHeight: 1.55 }}>
              A drafting agent produces an answer. A separate Claude agent, prompted as a
              domain skeptic, re-reads the source passages and rejects anything uncited or
              over-reaching. Applied to docs: each embedded page is accompanied by a
              "can this chunk be cited verbatim?" check before commit.
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#6a665d", marginTop: 10 }}>
              → maps to playbook · harvey-pattern
            </div>
          </div>
          <div style={{ border: "1px solid #1a1a1a", padding: 16, background: "#f5f3ee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: "var(--sans)", fontSize: 16, fontWeight: 500 }}>Parallel branches + consensus</div>
              <Tag tone="paper">legal-ai co. B</Tag>
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "#55514a", lineHeight: 1.55 }}>
              Multiple subagents work the same corpus on isolated workspaces and vote on
              final outputs. In the doc-embedding context: three subagents, three Neon
              branches, consensus chunk boundaries; disagreement is surfaced for review.
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#6a665d", marginTop: 10 }}>
              → maps to playbook · legora-pattern
            </div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid #1a1a1a", fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", display: "flex", justifyContent: "space-between" }}>
        <div>bench spec · {EVAL_SPEC.name}</div>
        <div>original design · numbers illustrative</div>
      </div>

      <TweakPanel state={tweaks} set={updateTweaks} visible={tweaksVisible} onClose={() => setTweaksVisible(false)} />

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 currentColor; }
          70% { box-shadow: 0 0 0 8px rgba(0,0,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
        }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
