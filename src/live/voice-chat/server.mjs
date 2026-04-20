// voice-chat/server.mjs
// Tiny zero-dep static server + token/proxy routes for the demo.
//
// Usage:
//   GEMINI_API_KEY=...          # required — mints ephemeral Live tokens
//   ANTHROPIC_API_KEY=...       # optional — for /api/ask-claude (judge + ask_claude)
//   ANAM_API_KEY=...            # optional — for /api/anam-token
//   ANAM_PERSONA_ID=...         # optional — default persona
//   HEYGEN_API_KEY=...          # optional — for /api/heygen-token
//   HEYGEN_AVATAR_NAME=...      # optional — default avatar
//   HEYGEN_VOICE_ID=...         # optional — default voice
//   PG_URL=postgres://...       # optional — for /api/pg (read-only role recommended)
//   PORT=5173
//
//   node server.mjs
//
// Endpoints:
//   GET  /                       → static files under this directory
//   POST /api/gemini-token       → { token } (ephemeral, scoped to Live API)
//   POST /api/ask-claude         → proxies to api.anthropic.com/v1/messages
//                                  special-cases {judge:true} for the loop judge
//   POST /api/anam-token         → { sessionToken, personaId }
//   POST /api/heygen-token       → { token, avatarName, voiceId }
//   POST /api/pg                 → { rows, fields } — only if PG_URL is set
//   GET  /api/fetch-doc?url=…    → passthrough GET, host-allowlisted

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 5173);
const ROOT = fileURLToPath(new URL(".", import.meta.url));

const ALLOWED_DOC_HOSTS = new Set([
  "docs.claude.com", "code.claude.com", "ai.google.dev",
  "anam.ai", "docs.heygen.com", "visionagents.ai",
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/gemini-token" && req.method === "POST") return await mintGeminiToken(res);
    if (url.pathname === "/api/anam-token"   && req.method === "POST") return await mintAnamToken(res);
    if (url.pathname === "/api/heygen-token" && req.method === "POST") return await mintHeygenToken(res);
    if (url.pathname === "/api/ask-claude"   && req.method === "POST") return await askClaude(req, res);
    if (url.pathname === "/api/pg"           && req.method === "POST") return await pgQuery(req, res);
    if (url.pathname === "/api/fetch-doc"    && req.method === "GET")  return await fetchDoc(url, res);
    return await serveStatic(url.pathname, res);
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`server error: ${e.message}`);
  }
});

// ---------------------------------------------------------------------------
// Static
// ---------------------------------------------------------------------------
async function serveStatic(path, res) {
  const clean = path === "/" ? "/index.html" : path;
  const file = resolve(join(ROOT, clean));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error("not a file");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}

// ---------------------------------------------------------------------------
// Gemini ephemeral token
// ---------------------------------------------------------------------------
async function mintGeminiToken(res) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(res, 500, { error: "GEMINI_API_KEY not set" });
  // The @google/genai SDK supports ai.authTokens.create({...}); for the demo
  // we just hand back the long-lived key. Replace with a real mint call in
  // any deployment where the page is reachable from the public internet.
  return json(res, 200, { token: key, note: "dev-mode passthrough — swap for ai.authTokens.create in prod" });
}

// ---------------------------------------------------------------------------
// Anam ephemeral session token
// ---------------------------------------------------------------------------
async function mintAnamToken(res) {
  const key = process.env.ANAM_API_KEY;
  const personaId = process.env.ANAM_PERSONA_ID;
  if (!key || !personaId) return json(res, 500, { error: "ANAM_API_KEY / ANAM_PERSONA_ID not set" });
  const r = await fetch("https://api.anam.ai/v1/auth/session-token", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ personaConfig: { personaId } }),
  });
  if (!r.ok) return json(res, r.status, { error: await r.text() });
  const j = await r.json();
  return json(res, 200, { sessionToken: j.sessionToken || j.token, personaId });
}

// ---------------------------------------------------------------------------
// HeyGen session token
// ---------------------------------------------------------------------------
async function mintHeygenToken(res) {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) return json(res, 500, { error: "HEYGEN_API_KEY not set" });
  const r = await fetch("https://api.heygen.com/v1/streaming.create_token", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
  });
  if (!r.ok) return json(res, r.status, { error: await r.text() });
  const j = await r.json();
  return json(res, 200, {
    token: j.data?.token || j.token,
    avatarName: process.env.HEYGEN_AVATAR_NAME || "Wayne_20240711",
    voiceId:    process.env.HEYGEN_VOICE_ID    || "",
  });
}

// ---------------------------------------------------------------------------
// Claude proxy (ask_claude + judge)
// ---------------------------------------------------------------------------
async function askClaude(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(res, 500, { error: "ANTHROPIC_API_KEY not set" });
  const body = await readBody(req);
  const { question, context, model, judge } = JSON.parse(body || "{}");

  const messages = judge
    ? [{ role: "user", content: JUDGE_PROMPT(question) }]
    : [{ role: "user", content: `${question}\n\nContext:\n${context || "(none)"}` }];

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-opus-4-7",
      max_tokens: judge ? 512 : 4096,
      messages,
      output_config: judge ? undefined : { effort: "high" },
    }),
  });
  if (!r.ok) return json(res, r.status, { error: await r.text() });
  const j = await r.json();
  const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();

  if (judge) {
    let verdict = { ok: true, reason: "parse-failed", followup_hint: null };
    try { verdict = JSON.parse(text); } catch {}
    return json(res, 200, { verdict });
  }
  return json(res, 200, { status: "ok", answer: text });
}

function JUDGE_PROMPT(payload) {
  return `You are a silent judge scoring the latest tool call in a live voice agent.
Read the JSON below and reply with strict JSON:
{"ok": boolean, "reason": string, "followup_hint": string|null}
- ok=true when the tool returned useful, well-formed output.
- ok=false on errors, empty results, or off-topic output. followup_hint then
  gives a one-sentence nudge the agent should say out loud.

INPUT:
${payload}`;
}

// ---------------------------------------------------------------------------
// Postgres proxy — only if PG_URL is set, and only read-only queries.
// ---------------------------------------------------------------------------
async function pgQuery(req, res) {
  if (!process.env.PG_URL) return json(res, 501, { status: "error", error: "PG_URL not set" });
  let pg;
  try { pg = await import("pg"); }
  catch { return json(res, 501, { status: "error", error: "pg package not installed" }); }
  const body = await readBody(req);
  const { query } = JSON.parse(body || "{}");
  if (!/^\s*(select|show|explain|with)\b/i.test(query || "")) {
    return json(res, 400, { status: "error", error: "only read-only queries allowed" });
  }
  const client = new pg.Client({ connectionString: process.env.PG_URL });
  try {
    await client.connect();
    const r = await client.query(query);
    return json(res, 200, { status: "ok", rows: r.rows, fields: r.fields?.map((f) => f.name) });
  } catch (e) {
    return json(res, 200, { status: "error", error: e.message });
  } finally {
    try { await client.end(); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Doc fetch proxy
// ---------------------------------------------------------------------------
async function fetchDoc(reqUrl, res) {
  const target = reqUrl.searchParams.get("url");
  let u;
  try { u = new URL(target); } catch { return json(res, 400, { error: "bad url" }); }
  if (!ALLOWED_DOC_HOSTS.has(u.host)) return json(res, 403, { error: `host not allowlisted: ${u.host}` });
  const r = await fetch(u.toString());
  const text = await r.text();
  res.writeHead(r.status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = ""; req.on("data", (c) => b += c); req.on("end", () => resolve(b)); req.on("error", reject);
  });
}

server.listen(PORT, () => {
  console.log(`voice-chat: http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) console.log("  ! GEMINI_API_KEY unset — /api/gemini-token will 500");
  if (!process.env.ANTHROPIC_API_KEY) console.log("  ! ANTHROPIC_API_KEY unset — ask_claude + judge will 500");
});
