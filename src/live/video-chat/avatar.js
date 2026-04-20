// Provider-agnostic avatar adapter.
// Backends: "anam" (default), "heygen", "none" (poster image fallback).
//
// Shape of every backend:
//   const av = await createAvatar({ provider, video, audio, config, token });
//   av.talk("hello there");
//   av.stop();

export async function createAvatar({ provider, video, audio, config, token }) {
  if (provider === "anam") return createAnam({ video, audio, config: config.anam, token });
  if (provider === "heygen") return createHeygen({ video, config: config.heygen, token });
  return createPoster({ video });
}

async function createAnam({ video, audio, config, token }) {
  if (!token) {
    console.warn("[avatar/anam] no session token — falling back to poster");
    return createPoster({ video });
  }
  const mod = await import("https://esm.sh/@anam-ai/js-sdk@latest");
  const { createClient } = mod;
  const client = createClient(token);
  // streamToVideoAndAudioElements accepts element ids OR elements depending
  // on SDK version; we pass ids to match the docs' happy path.
  const videoId = ensureId(video, "anam-video");
  const audioId = ensureId(audio, "anam-audio");
  await client.streamToVideoAndAudioElements(videoId, audioId);
  return {
    talk(text, { speak = true } = {}) {
      if (!text) return;
      if (typeof client.talk === "function") return client.talk(text, { speak });
      if (typeof client.sendUserMessage === "function") return client.sendUserMessage(text);
    },
    stop() {
      try { client.stopStreaming?.(); } catch {}
    },
  };
}

async function createHeygen({ video, config, token }) {
  if (!token) {
    console.warn("[avatar/heygen] no access token — falling back to poster");
    return createPoster({ video });
  }
  const mod = await import("https://esm.sh/@heygen/streaming-avatar@latest");
  const StreamingAvatar = mod.default;
  const AvatarQuality = mod.AvatarQuality || { low: "low", medium: "medium", high: "high" };
  const avatar = new StreamingAvatar({ token });
  avatar.on("stream_ready", (e) => {
    if (e?.detail) video.srcObject = e.detail;
    video.play?.().catch(() => {});
  });
  await avatar.createStartAvatar({
    avatarName: config.avatarName,
    quality: AvatarQuality[config.quality] || config.quality,
  });
  return {
    async talk(text) {
      if (!text) return;
      await avatar.speak({ text });
    },
    stop() {
      try { avatar.stopAvatar?.(); } catch {}
    },
  };
}

function createPoster({ video }) {
  video.poster =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'>
        <rect width='100%' height='100%' fill='#1a1a1a'/>
        <text x='50%' y='50%' fill='#ece8df' font-family='monospace' font-size='22'
              text-anchor='middle' dominant-baseline='middle'>avatar offline — poster mode</text>
      </svg>`,
    );
  return {
    talk(text) {
      console.log("[avatar/poster] talk:", text);
    },
    stop() {},
  };
}

function ensureId(el, fallback) {
  if (!el.id) el.id = fallback;
  return el.id;
}
