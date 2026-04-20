const { useState, useEffect, useRef, useMemo } = React;

// ---------- atoms ----------

function Tag({ children, tone = "ink" }) {
  const tones = {
    ink: { bg: "#1a1a1a", fg: "#f5f3ee" },
    ghost: { bg: "transparent", fg: "#1a1a1a", border: "1px solid #1a1a1a" },
    indigo: { bg: "oklch(0.55 0.15 260)", fg: "#f5f3ee" },
    amber: { bg: "oklch(0.70 0.15 70)", fg: "#1a1a1a" },
    paper: { bg: "#ece8df", fg: "#1a1a1a" },
  };
  const t = tones[tone] || tones.ink;
  return (
    <span
      style={{
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        padding: "3px 7px",
        background: t.bg,
        color: t.fg,
        border: t.border || "none",
        borderRadius: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Dot({ color = "#1a1a1a", pulse = false }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: color,
        display: "inline-block",
        boxShadow: pulse ? `0 0 0 0 ${color}` : "none",
        animation: pulse ? "pulse 1.6s infinite" : "none",
      }}
    />
  );
}

function KV({ k, v, w = 150 }) {
  return (
    <div style={{ display: "flex", gap: 10, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.6 }}>
      <div style={{ width: w, color: "#6a665d" }}>{k}</div>
      <div style={{ color: "#1a1a1a", flex: 1 }}>{v}</div>
    </div>
  );
}

function SectionHead({ n, title, subtitle }) {
  return (
    <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 14, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#6a665d" }}>{n}</span>
        <h2 style={{ fontFamily: "var(--sans)", fontSize: 22, fontWeight: 500, letterSpacing: -0.3, margin: 0 }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "#55514a", marginTop: 4, maxWidth: 640 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ---------- big number ----------

function BigMetric({ label, value, unit, delta, note }) {
  const good = delta && delta.startsWith("-");
  return (
    <div style={{ flex: 1, padding: "14px 16px", background: "#ece8df", border: "1px solid #1a1a1a" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: "#55514a" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 32, fontWeight: 500, letterSpacing: -0.5 }}>{value}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "#55514a" }}>{unit}</div>
      </div>
      {delta && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: good ? "oklch(0.45 0.12 150)" : "oklch(0.50 0.18 30)",
            marginTop: 2,
          }}
        >
          {delta} vs baseline
        </div>
      )}
      {note && (
        <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "#6a665d", marginTop: 6 }}>{note}</div>
      )}
    </div>
  );
}

// ---------- branch graph (SVG) ----------

function BranchGraph({ branches, activeId, onPick }) {
  const main = branches.find((b) => b.parent === null);
  const kids = branches.filter((b) => b.parent === main.id);
  const W = 720;
  const H = 240;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
      {/* trunk */}
      <line x1={60} y1={H / 2} x2={W - 40} y2={H / 2} stroke="#1a1a1a" strokeWidth={1.5} />
      {/* main node */}
      <g
        onClick={() => onPick(main.id)}
        style={{ cursor: "pointer" }}
      >
        <circle
          cx={60}
          cy={H / 2}
          r={activeId === main.id ? 10 : 7}
          fill={activeId === main.id ? "oklch(0.55 0.15 260)" : "#1a1a1a"}
        />
        <text x={60} y={H / 2 + 28} fontFamily="var(--mono)" fontSize={11} textAnchor="middle">
          {main.label}
        </text>
        <text x={60} y={H / 2 + 44} fontFamily="var(--mono)" fontSize={9} fill="#6a665d" textAnchor="middle">
          {main.size_mb} MB
        </text>
      </g>
      {/* children */}
      {kids.map((b, i) => {
        const x = 140 + i * 115;
        const up = i % 2 === 0;
        const y = up ? H / 2 - 70 : H / 2 + 70;
        const active = activeId === b.id;
        const running = b.state === "running";
        const color = running ? "oklch(0.55 0.15 260)" : b.state === "queued" ? "oklch(0.70 0.15 70)" : "#1a1a1a";
        return (
          <g key={b.id} style={{ cursor: "pointer" }} onClick={() => onPick(b.id)}>
            <path
              d={`M ${x - 50} ${H / 2} Q ${x - 25} ${H / 2}, ${x - 25} ${up ? H / 2 - 35 : H / 2 + 35} T ${x} ${y}`}
              stroke="#1a1a1a"
              strokeWidth={1}
              fill="none"
            />
            <circle cx={x} cy={y} r={active ? 9 : 6} fill={color} />
            {running && (
              <circle cx={x} cy={y} r={14} fill="none" stroke={color} strokeWidth={1}>
                <animate attributeName="r" values="6;18;6" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0;1" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <text
              x={x}
              y={up ? y - 16 : y + 22}
              fontFamily="var(--mono)"
              fontSize={11}
              textAnchor="middle"
              fill="#1a1a1a"
            >
              {b.label.replace("eval/", "")}
            </text>
            <text
              x={x}
              y={up ? y - 30 : y + 36}
              fontFamily="var(--mono)"
              fontSize={9}
              fill="#6a665d"
              textAnchor="middle"
            >
              {b.size_mb} MB · {b.state}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- bar chart ----------

function Bars({ rows, xKey, yKey, max, height = 140, color = "#1a1a1a", format = (v) => v }) {
  const m = max || Math.max(...rows.map((r) => r[yKey])) * 1.1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, borderBottom: "1px solid #1a1a1a", padding: "8px 0" }}>
      {rows.map((r, i) => {
        const h = (r[yKey] / m) * (height - 30);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "#55514a" }}>{format(r[yKey])}</div>
            <div style={{ width: "100%", height: h, background: color, transition: "height .4s" }} />
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: "#55514a",
                width: "100%",
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={r[xKey]}
            >
              {String(r[xKey]).slice(-18)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- streaming log ----------

function StreamLog({ lines, height = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);
  return (
    <div
      ref={ref}
      style={{
        height,
        overflowY: "auto",
        background: "#1a1a1a",
        color: "#f5f3ee",
        fontFamily: "var(--mono)",
        fontSize: 11,
        lineHeight: 1.6,
        padding: 12,
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: "pre", color: l.color || "#f5f3ee" }}>
          <span style={{ color: "#6a665d" }}>{l.t}</span>  {l.text}
        </div>
      ))}
      <div style={{ color: "oklch(0.70 0.15 70)" }}>▍</div>
    </div>
  );
}

Object.assign(window, { Tag, Dot, KV, SectionHead, BigMetric, BranchGraph, Bars, StreamLog });
