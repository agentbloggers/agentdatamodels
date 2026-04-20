// Shared configuration for the video-chat demo.
// Override any of these by appending ?key=val to the page URL; see main.js.

export const config = {
  gemini: {
    wsBase: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",
    model: "models/gemini-2.5-flash-preview-native-audio-dialog",
    responseModalities: ["AUDIO", "TEXT"],
    inputSampleRate: 16000,
    outputSampleRate: 24000,
    systemInstruction:
      "You are a friendly on-camera presenter. Keep turns under 25 words. " +
      "If the user goes silent for 8 seconds, ask a brief follow-up.",
  },
  avatar: {
    provider: "anam", // "anam" | "heygen" | "none"
    anam: {
      // Persona is created server-side; the browser only sees a session token.
      personaConfig: {
        name: "Cara",
        avatarId: "49a025b5-d6f2-4877-9b2a-7e8b9e3d31e1", // Anam default persona
        voiceId: "3aa6b7ec-2f93-4d4e-9c84-8bd5a4b8f3cd",
        // Set voiceId to null if you want Gemini audio to be the voice and
        // Anam only to render lips moving (talk(text, {speak:false})).
      },
    },
    heygen: {
      avatarName: "Anna_public_3_20240108",
      quality: "high", // "low" | "medium" | "high"
    },
  },
  tokenProxy: {
    // Same-origin proxy endpoints served by server.js.
    gemini: "/token/gemini",
    anam: "/token/anam",
    heygen: "/token/heygen",
  },
};
