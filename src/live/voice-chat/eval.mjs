#!/usr/bin/env node
// eval.mjs — fast regression eval for the voice-chat loop contract.
//
// Run:  node src/live/voice-chat/eval.mjs
//       (or `make eval-voice-chat` from repo root)
//
// Scope — only what we can check without a real API key or microphone:
//
// 1. Tool-registry parity.
//    Every name in `TOOL_DECLARATIONS` (sent to Gemini) must have a
//    matching `case "<name>":` in `runTool()`. Every `case` must have a
//    declaration. Mismatch = Gemini calls a tool we can't execute, or
//    we execute a tool Gemini never heard about.
//
// 2. FunctionDeclaration shape.
//    Each declaration needs a `name`, a `description`, and
//    `parameters.type === "object"` with a `properties` map. That's the
//    subset of Gemini's FunctionDeclaration schema we actually use.
//
// 3. Server-side refusal contracts.
//    Boot `server.mjs` with NO env vars and assert:
//    - GET  /                                → 200 (static serves)
//    - POST /api/gemini-token                → 500 (no key → graceful refuse)
//    - POST /api/ask-claude                  → 500 (no key → graceful refuse)
//    - GET  /api/fetch-doc?url=example.com   → 403 (host not allowlisted)
//    - GET  /api/fetch-doc?url=ai.google.dev → not 403 (allowed host
//      — may 5xx in offline CI, that's fine; we only check the gate)
//    - POST /api/pg                          → 501 (no PG_URL)
//
// Any failure exits non-zero so `make eval-voice-chat` fails loudly.

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JS = join(HERE, "app.js");
const SERVER_MJS = join(HERE, "server.mjs");

let passed = 0, failed = 0;
const results = [];

function ok(label)            { passed++; results.push(["ok  ", label]); }
function fail(label, detail)  { failed++; results.push(["FAIL", `${label} — ${detail}`]); }

// ---------------------------------------------------------------------------
// 1 + 2: static parse of app.js
// ---------------------------------------------------------------------------
const src = await readFile(APP_JS, "utf8");

function extractToolDeclarationNames(src) {
  const block = src.match(/const\s+TOOL_DECLARATIONS\s*=\s*\[([\s\S]*?)\n\];/);
  if (!block) return null;
  return [...block[1].matchAll(/\bname:\s*"([^"]+)"/g)].map((m) => m[1]);
}

function extractRunToolCases(src) {
  const block = src.match(/function\s+runTool\s*\([\s\S]*?switch\s*\([\s\S]*?\{([\s\S]*?)\n\s*\}\s*\}/);
  if (!block) return null;
  return [...block[1].matchAll(/case\s*"([^"]+)"\s*:/g)].map((m) => m[1]);
}

function extractDeclarationShape(src) {
  const block = src.match(/const\s+TOOL_DECLARATIONS\s*=\s*\[([\s\S]*?)\n\];/);
  if (!block) return [];
  // crude per-declaration splitter: each decl starts with `{\n    name:`
  const decls = block[1].split(/\n\s*\{\s*\n/).slice(1);
  return decls.map((d) => ({
    name:            (d.match(/\bname:\s*"([^"]+)"/)                  || [])[1],
    hasDescription:   /\bdescription:\s*/.test(d),
    hasParamsObject:  /\bparameters:\s*\{[\s\S]*?type:\s*"object"/.test(d),
    hasProperties:    /\bproperties:\s*\{/.test(d),
  }));
}

const declNames = extractToolDeclarationNames(src);
const caseNames = extractRunToolCases(src);

if (!declNames) fail("TOOL_DECLARATIONS block", "could not locate in app.js");
else ok(`TOOL_DECLARATIONS parsed (${declNames.length} tools: ${declNames.join(", ")})`);

if (!caseNames) fail("runTool switch", "could not locate in app.js");
else ok(`runTool switch parsed (${caseNames.length} cases: ${caseNames.join(", ")})`);

if (declNames && caseNames) {
  const declSet = new Set(declNames);
  const caseSet = new Set(caseNames);
  const onlyDecl = declNames.filter((n) => !caseSet.has(n));
  const onlyCase = caseNames.filter((n) => !declSet.has(n));
  if (onlyDecl.length) fail("tool declared but no executor", onlyDecl.join(", "));
  else ok("every declared tool has an executor");
  if (onlyCase.length) fail("executor without declaration", onlyCase.join(", "));
  else ok("every executor has a declaration");
}

for (const d of extractDeclarationShape(src)) {
  const problems = [];
  if (!d.name)            problems.push("missing name");
  if (!d.hasDescription)  problems.push("missing description");
  if (!d.hasParamsObject) problems.push("parameters.type !== object");
  if (!d.hasProperties)   problems.push("missing parameters.properties");
  if (problems.length) fail(`declaration shape for ${d.name || "(anon)"}`, problems.join(", "));
  else ok(`declaration shape ${d.name}`);
}

// ---------------------------------------------------------------------------
// 3: live server contracts
// ---------------------------------------------------------------------------
const PORT = 5199;                      // unlikely-to-collide eval port
const proc = spawn(process.execPath, [SERVER_MJS], {
  env: { ...process.env, PORT: String(PORT), GEMINI_API_KEY: "", ANTHROPIC_API_KEY: "", PG_URL: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOut = ""; proc.stdout.on("data", (c) => serverOut += c);
proc.stderr.on("data", (c) => serverOut += c);

await waitForPort(PORT, 3000);

async function req(method, path, opts = {}) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
      method,
      ...(opts.body ? { body: opts.body, headers: { "content-type": "application/json" } } : {}),
    });
    return { status: r.status };
  } catch (e) {
    return { status: -1, error: e.message };
  }
}

const cases = [
  { name: "GET /",                              fn: () => req("GET", "/"),                                  expect: 200 },
  { name: "GET /index.html",                    fn: () => req("GET", "/index.html"),                        expect: 200 },
  { name: "GET /app.js",                        fn: () => req("GET", "/app.js"),                            expect: 200 },
  { name: "POST /api/gemini-token (no key)",    fn: () => req("POST", "/api/gemini-token"),                 expect: 500 },
  { name: "POST /api/ask-claude (no key)",      fn: () => req("POST", "/api/ask-claude", { body: "{}" }),   expect: 500 },
  { name: "POST /api/pg (no PG_URL)",           fn: () => req("POST", "/api/pg", { body: "{}" }),           expect: 501 },
  { name: "GET /api/fetch-doc disallowed host", fn: () => req("GET", "/api/fetch-doc?url=https://example.com/"), expect: 403 },
  { name: "GET /api/fetch-doc allowed host",    fn: () => req("GET", "/api/fetch-doc?url=https://ai.google.dev/"), expectNot: 403 },
];

for (const c of cases) {
  const r = await c.fn();
  if ("expect" in c) {
    if (r.status === c.expect) ok(`${c.name} → ${r.status}`);
    else fail(c.name, `got ${r.status}${r.error ? " " + r.error : ""}, want ${c.expect}`);
  } else if ("expectNot" in c) {
    if (r.status !== c.expectNot) ok(`${c.name} → ${r.status} (not ${c.expectNot})`);
    else fail(c.name, `got ${r.status}, must not be ${c.expectNot}`);
  }
}

proc.kill("SIGTERM");

// ---------------------------------------------------------------------------
// summary
// ---------------------------------------------------------------------------
for (const [tag, msg] of results) console.log(`  ${tag}  ${msg}`);
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nserver log:\n" + serverOut.split("\n").map((l) => "    " + l).join("\n"));
  process.exit(1);
}

async function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) });
      if (r.status) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  console.error("server did not start in time");
  console.error(serverOut);
  process.exit(2);
}
