import { config } from "./config.js";
import { GeminiLiveClient } from "./client.js";
import { createAvatar } from "./avatar.js";

const el = {
  start: document.getElementById("start"),
  stop: document.getElementById("stop"),
  status: document.getElementById("status"),
  transcript: document.getElementById("transcript"),
  video: document.getElementById("avatar-video"),
  audio: document.getElementById("avatar-audio"),
  userText: document.getElementById("user-text"),
  send: document.getElementById("send"),
};

const params = new URLSearchParams(location.search);
const providerOverride = params.get("avatar");
if (providerOverride) config.avatar.provider = providerOverride;

let gemini = null;
let avatar = null;
let pendingTextBuffer = "";
let flushTimer = null;

el.start.addEventListener("click", start);
el.stop.addEventListener("click", stop);
el.send.addEventListener("click", () => {
  const t = el.userText.value.trim();
  if (!t || !gemini) return;
  el.userText.value = "";
  appendTranscript("user", t);
  gemini.sendText(t);
});

async function start() {
  el.start.disabled = true;
  setStatus("requesting tokens…");

  const [geminiToken, avatarToken] = await Promise.all([
    fetchToken(config.tokenProxy.gemini),
    fetchToken(config.tokenProxy[config.avatar.provider] || ""),
  ]);

  setStatus("starting avatar…");
  avatar = await createAvatar({
    provider: config.avatar.provider,
    video: el.video,
    audio: el.audio,
    config: config.avatar,
    token: avatarToken,
  });

  setStatus("connecting to Gemini Live…");
  gemini = new GeminiLiveClient(config.gemini);
  gemini.addEventListener("text-delta", (e) => onTextDelta(e.detail));
  gemini.addEventListener("turn-complete", flushToAvatar);
  gemini.addEventListener("status", (e) => setStatus(`gemini: ${e.detail.state}`));
  gemini.addEventListener("error", (e) => setStatus(`error: ${e.detail?.error?.message || "unknown"}`));

  // If no token came back, try the apiKey path from ?apiKey=... (dev only).
  if (!geminiToken && params.get("apiKey")) gemini.opts.apiKey = params.get("apiKey");

  await gemini.connect({ token: geminiToken });
  await gemini.startMic();

  el.stop.disabled = false;
  setStatus("live — speak or type");
}

function stop() {
  el.stop.disabled = true;
  el.start.disabled = false;
  setStatus("stopped");
  try { gemini?.close(); } catch {}
  try { avatar?.stop(); } catch {}
  gemini = null;
  avatar = null;
}

function onTextDelta({ text, role = "assistant" }) {
  if (!text) return;
  appendTranscript(role, text, /*append=*/ true);
  if (role === "assistant") {
    pendingTextBuffer += text;
    if (flushTimer) clearTimeout(flushTimer);
    // Flush in sentence-ish chunks so the avatar speaks naturally.
    if (/[.!?]\s*$/.test(pendingTextBuffer)) flushToAvatar();
    else flushTimer = setTimeout(flushToAvatar, 400);
  }
}

function flushToAvatar() {
  const t = pendingTextBuffer.trim();
  pendingTextBuffer = "";
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (!t || !avatar) return;
  avatar.talk(t);
}

function appendTranscript(role, text, append = false) {
  const last = el.transcript.lastElementChild;
  if (append && last && last.dataset.role === role) {
    last.querySelector(".t").textContent += text;
  } else {
    const row = document.createElement("div");
    row.className = `row row-${role}`;
    row.dataset.role = role;
    row.innerHTML = `<span class="r">${role}</span><span class="t"></span>`;
    row.querySelector(".t").textContent = text;
    el.transcript.appendChild(row);
  }
  el.transcript.scrollTop = el.transcript.scrollHeight;
}

function setStatus(s) { el.status.textContent = s; }

async function fetchToken(path) {
  if (!path) return null;
  try {
    const r = await fetch(path, { method: "POST" });
    if (!r.ok) return null;
    const j = await r.json();
    return j.token || j.sessionToken || j.access_token || null;
  } catch {
    return null;
  }
}
