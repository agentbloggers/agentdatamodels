// Gemini Live WebSocket client.
// Emits: "text-delta", "audio-chunk", "turn-complete", "status", "error".

export class GeminiLiveClient extends EventTarget {
  constructor(opts) {
    super();
    this.opts = opts;
    this.ws = null;
    this.audioCtx = null;
    this.micNode = null;
    this.playheadSec = 0;
  }

  async connect({ token }) {
    const url = token
      ? `${this.opts.wsBase}?access_token=${encodeURIComponent(token)}`
      : `${this.opts.wsBase}?key=${encodeURIComponent(this.opts.apiKey || "")}`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve(), { once: true });
      this.ws.addEventListener("error", (e) => reject(e), { once: true });
    });

    this._send({
      setup: {
        model: this.opts.model,
        generationConfig: {
          responseModalities: this.opts.responseModalities,
        },
        systemInstruction: this.opts.systemInstruction
          ? { parts: [{ text: this.opts.systemInstruction }] }
          : undefined,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });

    this.ws.addEventListener("message", (ev) => this._onMessage(ev));
    this.ws.addEventListener("close", () => this._emit("status", { state: "closed" }));
    this._emit("status", { state: "open" });
  }

  async startMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.opts.inputSampleRate,
    });
    const src = this.audioCtx.createMediaStreamSource(stream);
    // ScriptProcessor is deprecated but ubiquitous; AudioWorklet would be
    // the upgrade. Deliberate: keeps the demo build-step-free.
    const proc = this.audioCtx.createScriptProcessor(4096, 1, 1);
    src.connect(proc);
    proc.connect(this.audioCtx.destination);

    proc.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== 1) return;
      const f32 = e.inputBuffer.getChannelData(0);
      const pcm16 = floatToPcm16(f32);
      const b64 = arrayBufferToBase64(pcm16.buffer);
      this._send({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: `audio/pcm;rate=${this.opts.inputSampleRate}`,
              data: b64,
            },
          ],
        },
      });
    };
    this.micNode = { stream, proc, src };
  }

  stopMic() {
    if (!this.micNode) return;
    try { this.micNode.proc.disconnect(); } catch {}
    try { this.micNode.src.disconnect(); } catch {}
    for (const t of this.micNode.stream.getTracks()) t.stop();
    this.micNode = null;
  }

  sendText(text) {
    this._send({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    });
  }

  close() {
    this.stopMic();
    if (this.ws) try { this.ws.close(); } catch {}
  }

  _send(obj) {
    this.ws.send(JSON.stringify(obj));
  }

  _onMessage(ev) {
    let msg;
    try {
      msg = typeof ev.data === "string" ? JSON.parse(ev.data) : JSON.parse(new TextDecoder().decode(ev.data));
    } catch (err) {
      this._emit("error", { error: err });
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    const modelTurn = sc.modelTurn;
    if (modelTurn?.parts) {
      for (const p of modelTurn.parts) {
        if (p.text) this._emit("text-delta", { text: p.text });
        if (p.inlineData?.data && p.inlineData.mimeType?.startsWith("audio/")) {
          const pcm = base64ToArrayBuffer(p.inlineData.data);
          this._playPcm(pcm);
          this._emit("audio-chunk", { bytes: pcm.byteLength });
        }
      }
    }
    if (sc.inputTranscription?.text) {
      this._emit("text-delta", { text: sc.inputTranscription.text, role: "user" });
    }
    if (sc.outputTranscription?.text) {
      this._emit("text-delta", { text: sc.outputTranscription.text, role: "assistant" });
    }
    if (sc.turnComplete) this._emit("turn-complete", {});
  }

  _playPcm(buf) {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const i16 = new Int16Array(buf);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;
    const ab = this.audioCtx.createBuffer(1, f32.length, this.opts.outputSampleRate);
    ab.copyToChannel(f32, 0);
    const src = this.audioCtx.createBufferSource();
    src.buffer = ab;
    src.connect(this.audioCtx.destination);
    const now = this.audioCtx.currentTime;
    const start = Math.max(now, this.playheadSec);
    src.start(start);
    this.playheadSec = start + ab.duration;
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

function floatToPcm16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
