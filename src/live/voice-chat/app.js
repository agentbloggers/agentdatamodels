// voice-chat/app.js
// Code-execute-evaluate loop over Gemini Live, with optional Anam / HeyGen
// avatar rendering. See code-execute-evaluate-loop.md for the contract.
//
// This file is intentionally dependency-free in the static-site build:
// it lazy-imports @google/genai from a CDN on session start. server.mjs
// mints the ephemeral token so no API key ships in this bundle.

const MODEL = "gemini-3.1-flash-live-preview";
const JUDGE_MODEL = "claude-haiku-4-5";
const DEEP_MODEL = "claude-opus-4-7";
const MAX_TOOL_ROUNDS = 8;
const TARGET_IN_HZ = 16000;
const TARGET_OUT_HZ = 24000;
const ALLOWED_DOC_HOSTS = new Set([
  "docs.claude.com", "code.claude.com", "ai.google.dev",
  "anam.ai", "docs.heygen.com", "visionagents.ai",
]);

const $ = (id) => document.getElementById(id);
const logEl = $("log");
const liveDot = $("live-dot");
const liveState = $("live-state");
const roundCountEl = $("round-count");
const judgeStateEl = $("judge-state");
const avatarLabel = $("avatar-label");
const avatarProviderEl = $("avatar-provider");
const avatarStateEl = $("avatar-state");

let session = null;
let genAi = null;
let audioCtxIn = null;
let audioCtxOut = null;
let micStream = null;
let outQueueTime = 0;
let toolRounds = 0;
let inFlightTool = false;
let avatarClient = null;
let avatarProvider = "none";
let vadCooldownUntil = 0;

// ---------------------------------------------------------------------------
// Tool registry + schemas
// ---------------------------------------------------------------------------
const TOOL_DECLARATIONS = [
  {
    name: "run_js",
    description:
      "Run a short piece of JavaScript in a browser sandbox iframe. " +
      "No network, no DOM, 2s wall-time budget. Returns { value, logs }.",
    parameters: {
      type: "object",
      properties: { source: { type: "string" } },
      required: ["source"],
    },
  },
  {
    name: "run_sql",
    description:
      "Run a read-only SQL query against the local Postgres container. " +
      "Returns { rows, fields }.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "ask_claude",
    description:
      "Hand a hard, multi-step question to claude-opus-4-7 with " +
      "output_config.effort=high. Returns a string answer.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string" },
        context:  { type: "string" },
      },
      required: ["question"],
    },
  },
  {
    name: "fetch_doc",
    description:
      "GET a URL from the documentation host allowlist. Returns text.",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "set_avatar_mood",
    description:
      "Tell the avatar to adopt a facial mood. One of: " +
      "neutral, thinking, happy, concerned.",
    parameters: {
      type: "object",
      properties: { mood: { type: "string" } },
      required: ["mood"],
    },
  },
];

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
function log(text, cls = "") {
  const t = new Date().toISOString().slice(11, 19);
  const line = document.createElement("div");
  line.innerHTML = `<span class="t">${t}</span>  <span class="${cls}">${escapeHtml(text)}</span>`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}
function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

function setLiveState(s, kind = "") {
  liveState.textContent = s;
  liveDot.className = "dot " + kind;
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------
$("btn-start").addEventListener("click", startSession);
$("btn-stop").addEventListener("click", stopSession);
$("btn-barge").addEventListener("click", bargeIn);

async function startSession() {
  $("btn-start").disabled = true;
  $("btn-stop").disabled = false;
  $("btn-barge").disabled = false;
  toolRounds = 0; updateRoundCount();
  setLiveState("connecting…");

  // 1. Mint ephemeral token via server proxy.
  let token;
  try {
    const r = await fetch("/api/gemini-token", { method: "POST" });
    if (!r.ok) throw new Error(`token fetch ${r.status}`);
    const j = await r.json();
    token = j.token;
  } catch (e) {
    log(`token proxy error: ${e.message} — set GEMINI_API_KEY + restart server.mjs`, "err");
    setLiveState("error", "err");
    resetButtons();
    return;
  }

  // 2. Lazy-load the SDK.
  const { GoogleGenAI, Modality } = await import(
    "https://esm.run/@google/genai"
  );
  genAi = new GoogleGenAI({ apiKey: token });

  // 3. Optional avatar.
  avatarProvider = $("avatar-select").value;
  if (avatarProvider !== "none") {
    await startAvatar(avatarProvider);
  }

  // 4. Open Live session.
  session = await genAi.live.connect({
    model: MODEL,
    callbacks: {
      onopen:    () => onOpen(),
      onmessage: (m) => onMessage(m),
      onerror:   (e) => { log(`live error: ${e?.message || e}`, "err"); setLiveState("error", "err"); },
      onclose:   (e) => { log(`live close: ${e?.reason || "normal"}`); setLiveState("closed"); resetButtons(); },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: $("voice-select").value } },
      },
    },
  });

  await startMic();
}

async function stopSession() {
  if (session) { try { await session.close(); } catch {} session = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  if (audioCtxIn) { await audioCtxIn.close(); audioCtxIn = null; }
  if (audioCtxOut) { await audioCtxOut.close(); audioCtxOut = null; outQueueTime = 0; }
  if (avatarClient) { try { await avatarClient.stop(); } catch {} avatarClient = null; }
  setLiveState("idle");
  resetButtons();
}

function resetButtons() {
  $("btn-start").disabled = false;
  $("btn-stop").disabled = true;
  $("btn-barge").disabled = true;
}

function bargeIn() {
  if (!session) return;
  session.send({ clientContent: { turnComplete: true } });
  outQueueTime = 0;
  log("user barge-in → clientContent.turnComplete", "ok");
}

function onOpen() {
  setLiveState("live", "live");
  log(`session open → model=${MODEL} voice=${$("voice-select").value}`, "ok");
}

// ---------------------------------------------------------------------------
// Mic → 16kHz PCM → session.sendRealtimeInput
// ---------------------------------------------------------------------------
async function startMic() {
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioCtxIn = new AudioContext({ sampleRate: 48000 });
  const src = audioCtxIn.createMediaStreamSource(micStream);

  // Tiny inline AudioWorklet: 48k → 16k mono 16-bit PCM, post chunks.
  const workletCode = `
    class DownSampler extends AudioWorkletProcessor {
      constructor() { super(); this.buf = []; this.acc = 0; this.step = sampleRate / ${TARGET_IN_HZ}; }
      process(inputs) {
        const ch = inputs[0][0]; if (!ch) return true;
        for (let i = 0; i < ch.length; i++) {
          this.acc += 1;
          if (this.acc >= this.step) { this.buf.push(ch[i]); this.acc -= this.step; }
        }
        if (this.buf.length >= 1600) {
          const out = new Int16Array(this.buf.length);
          for (let i = 0; i < this.buf.length; i++) {
            let s = Math.max(-1, Math.min(1, this.buf[i]));
            out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          this.port.postMessage(out.buffer, [out.buffer]);
          this.buf = [];
        }
        return true;
      }
    }
    registerProcessor("downsampler", DownSampler);
  `;
  const blobUrl = URL.createObjectURL(new Blob([workletCode], { type: "application/javascript" }));
  await audioCtxIn.audioWorklet.addModule(blobUrl);
  const node = new AudioWorkletNode(audioCtxIn, "downsampler");
  node.port.onmessage = (ev) => {
    if (!session) return;
    const bytes = new Uint8Array(ev.data);
    // VAD-ish: if user speaks while model is talking, barge in.
    if (Date.now() > vadCooldownUntil && outQueueTime > audioCtxOut?.currentTime) {
      const rms = rmsFromPcm(bytes);
      if (rms > 0.03) { bargeIn(); vadCooldownUntil = Date.now() + 400; }
    }
    session.sendRealtimeInput({
      audio: { data: base64(bytes), mimeType: `audio/pcm;rate=${TARGET_IN_HZ}` },
    });
  };
  src.connect(node);
}

function rmsFromPcm(bytes) {
  const view = new DataView(bytes.buffer);
  let sum = 0; const n = bytes.length / 2;
  for (let i = 0; i < n; i++) {
    const s = view.getInt16(i * 2, true) / 0x8000; sum += s * s;
  }
  return Math.sqrt(sum / n);
}

function base64(bytes) {
  let s = ""; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// ---------------------------------------------------------------------------
// Server messages
// ---------------------------------------------------------------------------
async function onMessage(msg) {
  // 1) audio chunks
  const parts = msg?.serverContent?.modelTurn?.parts || [];
  for (const p of parts) {
    if (p?.inlineData?.mimeType?.startsWith("audio/pcm") && p.inlineData.data) {
      await playPcmChunk(p.inlineData.data);
    }
    if (p?.text) {
      log(`model: ${p.text}`, "");
      routeTurnToAvatar(p.text);
    }
  }

  // 2) tool calls
  const calls = msg?.toolCall?.functionCalls || [];
  for (const call of calls) {
    if (toolRounds >= MAX_TOOL_ROUNDS) {
      await respondToCall(call, { status: "error", error: "tool_round_budget_exceeded" });
      continue;
    }
    toolRounds += 1; updateRoundCount();
    inFlightTool = true;
    log(`toolCall: ${call.name}(${truncate(JSON.stringify(call.args), 80)})`);
    try {
      const result = await runTool(call.name, call.args || {});
      const verdict = await judge(call.name, call.args, result);
      judgeStateEl.textContent = verdict.ok ? "ok" : `fail: ${verdict.reason}`;
      await respondToCall(call, { status: result.status || "ok", result, _judge: verdict });
    } catch (e) {
      log(`  executor threw: ${e.message}`, "err");
      await respondToCall(call, { status: "error", error: e.message });
    } finally {
      inFlightTool = false;
    }
  }

  if (msg?.serverContent?.turnComplete) {
    log("turnComplete", "ok");
  }
}

async function respondToCall(call, response) {
  if (!session) return;
  await session.sendToolResponse({
    functionResponses: [{ id: call.id, name: call.name, response }],
  });
}

function updateRoundCount() { roundCountEl.textContent = String(toolRounds); }

// ---------------------------------------------------------------------------
// 24kHz PCM playback queue
// ---------------------------------------------------------------------------
async function playPcmChunk(b64) {
  if (!audioCtxOut) audioCtxOut = new AudioContext({ sampleRate: TARGET_OUT_HZ });
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float[i] = int16[i] / 0x8000;
  const buf = audioCtxOut.createBuffer(1, float.length, TARGET_OUT_HZ);
  buf.copyToChannel(float, 0);
  const src = audioCtxOut.createBufferSource();
  src.buffer = buf; src.connect(audioCtxOut.destination);
  const now = audioCtxOut.currentTime;
  const start = Math.max(now, outQueueTime);
  src.start(start);
  outQueueTime = start + buf.duration;
}

// ---------------------------------------------------------------------------
// Tool executors
// ---------------------------------------------------------------------------
async function runTool(name, args) {
  switch (name) {
    case "run_js":           return await runJs(args.source);
    case "run_sql":          return await runSql(args.query);
    case "ask_claude":       return await askClaude(args.question, args.context);
    case "fetch_doc":        return await fetchDoc(args.url);
    case "set_avatar_mood":  return setAvatarMood(args.mood);
    default:                 return { status: "error", error: `unknown tool ${name}` };
  }
}

function runJs(source) {
  return new Promise((resolve) => {
    const sandbox = $("sandbox").contentWindow;
    const id = crypto.randomUUID();
    const onMsg = (ev) => {
      if (ev.data?.id !== id) return;
      window.removeEventListener("message", onMsg);
      resolve(ev.data.result);
    };
    window.addEventListener("message", onMsg);
    sandbox.postMessage({ id, kind: "run_js", source }, "*");
    setTimeout(() => {
      window.removeEventListener("message", onMsg);
      resolve({ status: "error", error: "sandbox timeout (2000ms)" });
    }, 2100);
  });
}

async function runSql(query) {
  const r = await fetch("/api/pg", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) return { status: "error", error: `pg proxy ${r.status}` };
  return await r.json();
}

async function askClaude(question, context) {
  const r = await fetch("/api/ask-claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, context, model: DEEP_MODEL }),
  });
  if (!r.ok) return { status: "error", error: `claude proxy ${r.status}` };
  return await r.json();
}

async function fetchDoc(url) {
  try {
    const u = new URL(url);
    if (!ALLOWED_DOC_HOSTS.has(u.host)) {
      return { status: "error", error: `host not allowlisted: ${u.host}` };
    }
  } catch { return { status: "error", error: "bad url" }; }
  const r = await fetch(`/api/fetch-doc?url=${encodeURIComponent(url)}`);
  if (!r.ok) return { status: "error", error: `fetch-doc ${r.status}` };
  return { status: "ok", text: await r.text() };
}

function setAvatarMood(mood) {
  if (avatarClient?.setMood) avatarClient.setMood(mood);
  avatarStateEl.textContent = `mood=${mood}`;
  return { status: "ok", mood };
}

// ---------------------------------------------------------------------------
// Judge — claude-haiku-4-5 via /api/ask-claude
// ---------------------------------------------------------------------------
async function judge(name, args, result) {
  try {
    const r = await fetch("/api/ask-claude", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        judge: true,
        question: JSON.stringify({ name, args, result }),
      }),
    });
    if (!r.ok) return { ok: true, reason: `judge unavailable (${r.status})` };
    const j = await r.json();
    return j.verdict || { ok: true, reason: "no verdict" };
  } catch (e) {
    return { ok: true, reason: `judge error: ${e.message}` };
  }
}

// ---------------------------------------------------------------------------
// Avatar adapters
// ---------------------------------------------------------------------------
async function startAvatar(provider) {
  avatarProviderEl.textContent = provider;
  avatarStateEl.textContent = "connecting…";
  avatarLabel.textContent = provider;

  if (provider === "anam") {
    const { createClient } = await import("https://esm.run/@anam-ai/js-sdk");
    const { sessionToken, personaId } = await (await fetch("/api/anam-token", { method: "POST" })).json();
    const client = createClient(sessionToken, { personaId });
    await client.streamToVideoAndAudioElements("avatar-video", "avatar-audio");
    avatarClient = {
      speak: (t) => client.talk(t),
      setMood: () => {},  // Anam handles affect server-side
      stop: () => client.stopStreaming?.(),
    };
    avatarStateEl.textContent = "live";
  } else if (provider === "heygen") {
    const mod = await import("https://esm.run/@heygen/streaming-avatar");
    const StreamingAvatar = mod.default;
    const { AvatarQuality, TaskType } = mod;
    const { token, avatarName, voiceId } = await (await fetch("/api/heygen-token", { method: "POST" })).json();
    const av = new StreamingAvatar({ token });
    av.on("stream_ready", (e) => {
      const v = $("avatar-video"); v.srcObject = e.detail; v.play();
    });
    av.on("stream_disconnected", () => { avatarStateEl.textContent = "disconnected"; });
    await av.createStartAvatar({
      quality: AvatarQuality.Low,
      avatarName,
      voice: { voiceId },
    });
    avatarClient = {
      speak: (t) => av.speak({ text: t, task_type: TaskType.REPEAT }),
      setMood: () => {},
      stop: () => av.stopAvatar(),
    };
    avatarStateEl.textContent = "live";
  }
}

function routeTurnToAvatar(text) {
  if (!avatarClient || !text) return;
  avatarClient.speak(text).catch((e) => log(`avatar speak error: ${e.message}`, "err"));
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------
function truncate(s, n) { return s.length > n ? s.slice(0, n) + "…" : s; }

const SYSTEM_PROMPT = `
You are a calm realtime coding partner speaking out loud to a developer.

House rules:
- Prefer tools over guessing. Call run_js for short arithmetic or code
  checks. Call run_sql for data from the local Postgres. Call ask_claude
  for hard multi-step reasoning. Call fetch_doc for documentation you need
  to cite (host must be in the allowlist).
- Every tool call is wrapped in a code-execute-evaluate loop. A silent
  judge scores the result; if judge.ok is false, narrate what went wrong
  and try a different approach rather than repeating the same call.
- Keep spoken replies short. Use the avatar mood tool sparingly.
- Never invent API keys, URLs, or slash commands. If you don't know, say so.
`.trim();
