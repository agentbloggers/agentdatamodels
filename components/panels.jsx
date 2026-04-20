const { useState, useEffect, useRef, useMemo } = React;

function PlaybookCard({ pb, active, onPick }) {
  return (
    <div
      onClick={() => onPick(pb.id)}
      style={{
        border: active ? "2px solid oklch(0.55 0.15 260)" : "1px solid #1a1a1a",
        padding: 14,
        cursor: "pointer",
        background: active ? "#ece8df" : "#f5f3ee",
        transition: "background .15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500 }}>{pb.label}</div>
        {active && <Tag tone="indigo">active</Tag>}
      </div>
      <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "#55514a", marginTop: 4 }}>{pb.one_liner}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", marginTop: 8 }}>
        ref · {pb.basis}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 10, fontFamily: "var(--mono)", fontSize: 11 }}>
        <div><span style={{ color: "#6a665d" }}>p50</span> {pb.expected.latency_ms_per_page}ms</div>
        <div><span style={{ color: "#6a665d" }}>$/1k</span> ${pb.expected.cost_usd_per_1k_pages}</div>
        <div><span style={{ color: "#6a665d" }}>mem</span> {pb.expected.branch_mem_mb}MB</div>
        <div><span style={{ color: "#6a665d" }}>par</span> {pb.expected.parallelism}×</div>
      </div>
    </div>
  );
}

function BranchRow({ b, active, onPick }) {
  const stateColor =
    b.state === "running" ? "oklch(0.55 0.15 260)" : b.state === "queued" ? "oklch(0.70 0.15 70)" : "#6a665d";
  return (
    <tr
      onClick={() => onPick(b.id)}
      style={{
        cursor: "pointer",
        background: active ? "#ece8df" : "transparent",
        borderBottom: "1px solid #d9d4c8",
      }}
    >
      <td style={{ padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot color={stateColor} pulse={b.state === "running"} />
          {b.label}
        </div>
      </td>
      <td style={{ padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 11, color: "#55514a" }}>
        {b.parent || "—"}
      </td>
      <td style={{ padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 11 }}>{b.compute}</td>
      <td style={{ padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 11 }}>PG{b.pg}</td>
      <td style={{ padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 11 }}>{b.size_mb} MB</td>
      <td style={{ padding: "10px 12px", fontFamily: "var(--mono)", fontSize: 11, color: stateColor }}>{b.state}</td>
    </tr>
  );
}

function DocPageRow({ run, onClick, active }) {
  return (
    <tr
      onClick={onClick}
      style={{
        cursor: "pointer",
        background: active ? "#ece8df" : "transparent",
        borderBottom: "1px solid #d9d4c8",
      }}
    >
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, color: "#55514a" }}>
        {String(run.idx + 1).padStart(3, "0")}
      </td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {run.slug}
      </td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, textAlign: "right" }}>{run.tokens.toLocaleString()}</td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, textAlign: "right" }}>{run.chunks}</td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, textAlign: "right" }}>{run.hash_ms.toFixed(1)}</td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, textAlign: "right" }}>{run.embed_ms.toFixed(0)}</td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, textAlign: "right" }}>{run.total_ms.toFixed(0)}</td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 11, textAlign: "right" }}>${run.cost_usd.toFixed(5)}</td>
      <td style={{ padding: "8px 12px", fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d" }}>{run.hash}</td>
    </tr>
  );
}

function TweakPanel({ state, set, visible, onClose }) {
  if (!visible) return null;
  const opt = (val, cur, on) => ({
    padding: "4px 8px",
    fontFamily: "var(--mono)",
    fontSize: 11,
    cursor: "pointer",
    background: val === cur ? "#1a1a1a" : "transparent",
    color: val === cur ? "#f5f3ee" : "#1a1a1a",
    border: "1px solid #1a1a1a",
    marginRight: 4,
    marginBottom: 4,
  });
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 320,
        background: "#f5f3ee",
        border: "1px solid #1a1a1a",
        zIndex: 50,
        boxShadow: "4px 4px 0 #1a1a1a",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #1a1a1a" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>Tweaks</div>
        <div onClick={onClose} style={{ cursor: "pointer", fontFamily: "var(--mono)", fontSize: 11 }}>×</div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", marginBottom: 6 }}>PG VERSION</div>
        {["14", "15", "16", "17", "18"].map((v) => (
          <span key={v} style={opt(v, state.pg)} onClick={() => set({ pg: v })}>PG{v}</span>
        ))}

        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", margin: "12px 0 6px" }}>EMBEDDING</div>
        {["pgvector+voyage", "pgrag bge-small", "lancedb-external"].map((v) => (
          <span key={v} style={opt(v, state.embedding)} onClick={() => set({ embedding: v })}>{v}</span>
        ))}

        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", margin: "12px 0 6px" }}>CORPUS</div>
        {["neon", "cloudflare", "both"].map((v) => (
          <span key={v} style={opt(v, state.corpus)} onClick={() => set({ corpus: v })}>{v}</span>
        ))}

        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#6a665d", margin: "12px 0 6px" }}>
          BRANCHES: {state.branchCount}
        </div>
        <input
          type="range"
          min={2}
          max={8}
          value={state.branchCount}
          onChange={(e) => set({ branchCount: +e.target.value })}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

Object.assign(window, { PlaybookCard, BranchRow, DocPageRow, TweakPanel });
