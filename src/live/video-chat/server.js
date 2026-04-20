// Minimal token proxy + static file server for src/live/video-chat.
// Runs on Node >=20 (native fetch). No external dependencies.
//
//   GOOGLE_API_KEY=...  ANAM_API_KEY=...  HEYGEN_API_KEY=...  node server.js
//
// Endpoints:
//   POST /token/gemini  → { token }          (Gemini ephemeral)
//   POST /token/anam    → { sessionToken }   (Anam session)
//   POST /token/heygen  → { token }          (HeyGen streaming)
//   GET  /*             → static files from this directory
//
// If a key is absent, the corresponding endpoint returns 204 so the
// browser falls through to "mock"/"no-avatar" mode.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
};

const routes = {
  "POST /token/gemini": geminiToken,
  "POST /token/anam":   anamToken,
  "POST /token/heygen": heygenToken,
};

http
  .createServer(async (req, res) => {
    const key = `${req.method} ${req.url.split("?")[0]}`;
    const handler = routes[key];
    try {
      if (handler) return await handler(req, res);
      if (req.method === "GET") return serveStatic(req, res);
      res.writeHead(405).end();
    } catch (err) {
      console.error("[server]", err);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
  })
  .listen(PORT, () => console.log(`video-chat proxy + static on http://localhost:${PORT}/`));

async function geminiToken(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.writeHead(204).end();
  // Ephemeral token endpoint — verify the exact path/version against
  // ai.google.dev/gemini-api/docs/ephemeral-tokens before shipping.
  const r = await fetch(
    "https://generativelanguage.googleapis.com/v1alpha/auth/ephemeralTokens?key=" +
      encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expireTimeSeconds: 600,
      }),
    },
  );
  if (!r.ok) {
    const body = await r.text();
    return json(res, r.status, { error: "gemini token exchange failed", body });
  }
  const j = await r.json();
  json(res, 200, { token: j.name || j.token || null });
}

async function anamToken(req, res) {
  const apiKey = process.env.ANAM_API_KEY;
  if (!apiKey) return res.writeHead(204).end();
  const r = await fetch("https://api.anam.ai/v1/auth/session-token", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      personaConfig: {
        name: process.env.ANAM_PERSONA_NAME || "Cara",
        avatarId: process.env.ANAM_AVATAR_ID || undefined,
        voiceId: process.env.ANAM_VOICE_ID || undefined,
      },
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    return json(res, r.status, { error: "anam token exchange failed", body });
  }
  const j = await r.json();
  json(res, 200, { sessionToken: j.sessionToken || j.token });
}

async function heygenToken(req, res) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return res.writeHead(204).end();
  const r = await fetch("https://api.heygen.com/v1/streaming.create_token", {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: "{}",
  });
  if (!r.ok) {
    const body = await r.text();
    return json(res, r.status, { error: "heygen token exchange failed", body });
  }
  const j = await r.json();
  json(res, 200, { token: j?.data?.token || j.token });
}

function serveStatic(req, res) {
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const safe = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  let file = path.join(ROOT, safe);
  if (file.endsWith(path.sep) || rel === "/") file = path.join(ROOT, "index.html");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
