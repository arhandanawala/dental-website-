import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI, Modality } from "@google/genai";
import { MAYA_SYSTEM_PROMPT, LIVE_FUNCTION_DECLARATIONS } from "./prompt.js";
import { publish } from "./livebus.js";
import * as db from "./db.js";
import * as cms from "./cms-store.js";

import {
  DEFAULT_LIVE_MODEL,
  FALLBACK_LIVE_MODEL,
  DEFAULT_VOICE,
  sanitizeEnvValue,
  buildModelCandidates,
  isModelUnsupportedClose,
  formatGeminiCloseError,
  discoverLiveModels,
} from "./voice-utils.js";

export { DEFAULT_LIVE_MODEL, DEFAULT_VOICE };

function activeApiKey() {
  return sanitizeEnvValue(process.env.GEMINI_API_KEY);
}

export function getVoiceStatus() {
  const configured = Boolean(activeApiKey());
  return {
    configured,
    model: sanitizeEnvValue(process.env.GEMINI_LIVE_MODEL) || DEFAULT_LIVE_MODEL,
    fallbackModel: FALLBACK_LIVE_MODEL,
    voice: sanitizeEnvValue(process.env.GEMINI_VOICE) || DEFAULT_VOICE,
  };
}

export async function probeVoiceHealth() {
  const status = getVoiceStatus();
  const apiKey = activeApiKey();
  if (!apiKey) {
    return {
      ...status,
      modelsApiStatus: 0,
      availableLiveModels: [],
      error: "GEMINI_API_KEY is not configured.",
    };
  }
  const discovery = await discoverLiveModels(apiKey);
  return {
    ...status,
    modelsApiStatus: discovery.status,
    availableLiveModels: discovery.liveModels,
    error: discovery.error,
  };
}

function activeSystemPrompt() {
  const override = db.getSetting("systemPrompt");
  const snap = cms.getPublicSnapshot();
  const base = override || MAYA_SYSTEM_PROMPT;
  const liveFacts = [
    `LIVE CLINIC DATA:`,
    `- Clinic: ${snap.siteContent.clinicName}`,
    `- Phone: ${snap.siteContent.phone}`,
    `- Email: ${snap.siteContent.email}`,
    `- Address: ${snap.siteContent.address}`,
    `- Hours: ${snap.siteContent.openingHours}`,
    `- Doctors: ${snap.doctors.map((d) => `${d.name} (${d.credentials})`).join("; ")}`,
    `- Treatments: ${snap.treatments.map((t) => t.title).join(", ")}`,
  ].join("\n");
  return `${base}\n\n${liveFacts}`;
}

async function runTool(name, args, callId) {
  if (name === "get_clinic_details") {
    const snap = cms.getPublicSnapshot();
    return {
      ok: true,
      clinicName: snap.siteContent.clinicName,
      phone: snap.siteContent.phone,
      email: snap.siteContent.email,
      address: snap.siteContent.address,
      openingHours: snap.siteContent.openingHours,
      doctors: snap.doctors.map((d) => ({
        name: d.name,
        credentials: d.credentials,
        role: d.role,
        specializations: d.specializations,
      })),
      treatments: snap.treatments.map((t) => ({
        title: t.title,
        category: t.category,
        summary: t.shortDescription,
      })),
    };
  }

  if (name === "request_appointment_callback") {
    const appt = cms.createAppointment({
      name: args.name,
      phone: args.phone,
      email: args.email || "",
      treatment: args.treatment || "General Consultation",
      preferredDate: args.preferred_date || "Next available",
      preferredTime: args.preferred_time || "Flexible",
      preferredContact: "Phone Call",
      message: args.notes || "Requested via Maya Voice Assistant",
      sourcePage: "Maya Voice Assistant",
    });

    db.patchCall(callId, {
      outcome: "booked",
      patientName: appt.name,
      patientEmail: appt.email || null,
      patientPhone: appt.phone || null,
      slotStart: [appt.preferredDate, appt.preferredTime].filter(Boolean).join(" · "),
      summary: `${appt.treatment} — ${appt.message}`,
    });

    return {
      ok: true,
      appointment: appt,
      message:
        "Appointment request saved to the Smile Masters Bandra West desk. Confirm the patient's details out loud and let them know our clinic team will reach out shortly to confirm their slot.",
    };
  }

  if (name === "save_call_outcome") {
    const existing = db.getCall(callId);
    db.patchCall(callId, {
      outcome: args.booked ? "booked" : "not_booked",
      summary: args.summary || existing?.summary || null,
      patientName: args.patient_name || existing?.patientName || null,
      patientEmail: args.patient_email || existing?.patientEmail || null,
      patientPhone: args.patient_phone || existing?.patientPhone || null,
      slotStart: args.slot_start || existing?.slotStart || null,
    });
    return { ok: true };
  }

  if (name === "end_call") {
    return {
      ok: true,
      ended: true,
      message: "Say a warm one-line goodbye, then the call will close.",
    };
  }

  return { ok: false, error: `Unknown tool: ${name}` };
}

const TARGET_RATE = 16000;

function resamplePcm16(buf, rate) {
  const srcSamples = Math.floor(buf.length / 2);
  if (srcSamples === 0) return Buffer.alloc(0);
  if (rate === TARGET_RATE) return Buffer.from(buf);
  const step = rate / TARGET_RATE;
  const outSamples = Math.floor(srcSamples / step);
  const out = Buffer.alloc(outSamples * 2);
  const lastIdx = srcSamples - 1;
  for (let i = 0; i < outSamples; i++) {
    const x = i * step;
    const i0 = Math.min(Math.floor(x), lastIdx);
    const i1 = Math.min(i0 + 1, lastIdx);
    const frac = x - i0;
    const a = buf.readInt16LE(i0 * 2);
    const b = buf.readInt16LE(i1 * 2);
    let v = Math.round(a + (b - a) * frac);
    if (v > 32767) v = 32767;
    if (v < -32768) v = -32768;
    out.writeInt16LE(v, i * 2);
  }
  return out;
}

function createRecorder() {
  const caller = [];
  const mayaChunks = [];
  let callerSamples = 0;
  let mayaSamples = 0;
  return {
    caller(base64) {
      const buf = Buffer.from(base64, "base64");
      if (!buf.length) return;
      caller.push(buf);
      callerSamples += buf.length / 2;
    },
    maya(base64, mimeType) {
      const rate = Number(/rate=(\d+)/.exec(mimeType || "")?.[1]) || 24000;
      const buf = Buffer.from(base64, "base64");
      if (!buf.length) return;
      mayaChunks.push({ buf, rate });
      mayaSamples += resamplePcm16(buf, rate).length / 2;
    },
    hasAudio: () => callerSamples > 0 || mayaSamples > 0,
    writeWav(filePath) {
      const total = Math.max(callerSamples, mayaSamples);
      const left = Buffer.alloc(total * 2);
      let off = 0;
      for (const b of caller) {
        b.copy(left, off);
        off += b.length;
      }
      const right = Buffer.alloc(total * 2);
      off = 0;
      for (const { buf, rate } of mayaChunks) {
        const out = resamplePcm16(buf, rate);
        out.copy(right, off);
        off += out.length;
      }
      const dataLength = total * 4;
      const header = Buffer.alloc(44);
      header.write("RIFF", 0);
      header.writeUInt32LE(36 + dataLength, 4);
      header.write("WAVE", 8);
      header.write("fmt ", 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(2, 22);
      header.writeUInt32LE(TARGET_RATE, 24);
      header.writeUInt32LE(TARGET_RATE * 4, 28);
      header.writeUInt16LE(4, 32);
      header.writeUInt16LE(16, 34);
      header.write("data", 36);
      header.writeUInt32LE(dataLength, 40);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, Buffer.concat([header, left, right]));
    },
  };
}

function sendJson(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      /* socket already closing */
    }
  }
}

export async function attachLiveSession(clientWs, { timezone } = {}) {
  const apiKey = activeApiKey();
  if (!apiKey) {
    throw new Error(
      "Voice AI server key (GEMINI_API_KEY) is not configured yet. Please ensure GEMINI_API_KEY is set in your server environment or Secrets, or call +91 77389 68210."
    );
  }

  const modelCandidates = buildModelCandidates(process.env.GEMINI_LIVE_MODEL);
  let activeModel = modelCandidates[0];
  const voiceName = sanitizeEnvValue(process.env.GEMINI_VOICE) || DEFAULT_VOICE;

  const ai = new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const call = db.createCall({ model: activeModel });
  const recorder = createRecorder();

  let session = null;
  let closed = false;
  let readySent = false;
  let timeLimitTimer = null;
  let hardStopTimer = null;
  let mayaHangupTimer = null;

  const closeBoth = (reason, { suppressEnded = false } = {}) => {
    if (closed) return;
    closed = true;
    if (timeLimitTimer) clearTimeout(timeLimitTimer);
    if (hardStopTimer) clearTimeout(hardStopTimer);
    if (mayaHangupTimer) clearTimeout(mayaHangupTimer);

    db.patchCall(call.id, {
      status: "completed",
      endedAt: new Date().toISOString(),
    });

    if (recorder.hasAudio()) {
      try {
        const file = path.join(process.cwd(), "data", "recordings", `${call.id}.wav`);
        recorder.writeWav(file);
        db.patchCall(call.id, { recording: true });
      } catch (err) {
        console.warn(`[maya] recording save failed: ${err.message}`);
      }
    }

    if (!suppressEnded) {
      sendJson(clientWs, { type: "ended", reason: reason || "done" });
    }
    try {
      session?.close();
    } catch {
      /* ignore */
    }
    try {
      clientWs.close();
    } catch {
      /* ignore */
    }
  };

  const failAndClose = (message, reason = "gemini_error") => {
    if (closed) return;
    db.patchCall(call.id, { summary: message });
    sendJson(clientWs, { type: "error", message });
    closeBoth(reason, { suppressEnded: true });
  };

  const connectWithModel = async (modelName) => {
    activeModel = modelName;
    return ai.live.connect({
      model: modelName,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
        systemInstruction: activeSystemPrompt(),
        tools: [{ functionDeclarations: LIVE_FUNCTION_DECLARATIONS }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onmessage: async (msg) => {
          if (closed) return;
          try {
            const sc = msg.serverContent;
            if (sc?.interrupted) {
              sendJson(clientWs, { type: "interrupted" });
            }

            if (sc?.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const mimeType = part.inlineData.mimeType || "audio/pcm;rate=24000";
                  recorder.maya(part.inlineData.data, mimeType);
                  publish(call.id, "maya", part.inlineData.data, 24000);
                  sendJson(clientWs, {
                    type: "audio",
                    mimeType,
                    data: part.inlineData.data,
                  });
                }
                if (part.text && !part.thought) {
                  db.appendTranscript(call.id, {
                    role: "maya",
                    text: part.text,
                    at: new Date().toISOString(),
                  });
                  sendJson(clientWs, {
                    type: "transcript",
                    role: "maya",
                    text: part.text,
                    finished: false,
                  });
                }
              }
            }

            if (sc?.inputTranscription?.text) {
              db.appendTranscript(call.id, {
                role: "caller",
                text: sc.inputTranscription.text,
                at: new Date().toISOString(),
                partial: !sc.inputTranscription.finished,
              });
              sendJson(clientWs, {
                type: "transcript",
                role: "caller",
                text: sc.inputTranscription.text,
                finished: Boolean(sc.inputTranscription.finished),
              });
            }

            if (sc?.outputTranscription?.text) {
              db.appendTranscript(call.id, {
                role: "maya",
                text: sc.outputTranscription.text,
                at: new Date().toISOString(),
                partial: !sc.outputTranscription.finished,
              });
              sendJson(clientWs, {
                type: "transcript",
                role: "maya",
                text: sc.outputTranscription.text,
                finished: Boolean(sc.outputTranscription.finished),
              });
            }

            if (sc?.turnComplete) {
              sendJson(clientWs, { type: "turnComplete" });
            }

            if (msg.toolCall?.functionCalls?.length) {
              const functionResponses = [];
              let endCallRequested = false;
              for (const fc of msg.toolCall.functionCalls) {
                let result;
                try {
                  result = await runTool(fc.name, fc.args || {}, call.id);
                } catch (err) {
                  result = { ok: false, error: err instanceof Error ? err.message : String(err) };
                }
                sendJson(clientWs, { type: "tool", name: fc.name, result });
                if (fc.name === "end_call") endCallRequested = true;
                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { result },
                });
              }
              session?.sendToolResponse({ functionResponses });
              if (endCallRequested) {
                mayaHangupTimer = setTimeout(() => closeBoth("maya_hangup"), 2500);
              }
            }
          } catch (err) {
            console.error("[maya] message handler error:", err);
          }
        },
        onerror: (err) => {
          const message = err?.message || "Voice connection interrupted.";
          console.error("[maya] Gemini Live error:", message);
          failAndClose(message, "gemini_error");
        },
        onclose: (ev) => {
          if (closed) return;
          const code = ev?.code || 0;
          const reason = ev?.reason || "";
          if (!readySent || (code && code !== 1000 && code !== 1001)) {
            failAndClose(formatGeminiCloseError(code, reason, activeModel), "gemini_closed_error");
            return;
          }
          closeBoth("gemini_closed");
        },
      },
    });
  };

  let lastConnectError = null;
  for (let i = 0; i < modelCandidates.length; i++) {
    try {
      session = await connectWithModel(modelCandidates[i]);
      lastConnectError = null;
      break;
    } catch (err) {
      lastConnectError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (i + 1 < modelCandidates.length && isModelUnsupportedClose(0, errMsg)) {
        continue;
      }
      break;
    }
  }

  if (!session) {
    const errMsg = lastConnectError instanceof Error ? lastConnectError.message : String(lastConnectError || "Connection failed");
    db.patchCall(call.id, {
      status: "completed",
      endedAt: new Date().toISOString(),
      summary: `Connection failed: ${errMsg}`,
    });
    throw new Error(formatGeminiCloseError(0, errMsg, activeModel));
  }

  readySent = true;
  sendJson(clientWs, { type: "ready", callId: call.id, model: activeModel, voice: voiceName });

  // Kick off Maya's warm greeting right away.
  try {
    session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [
            {
              text: `A visitor just connected to the Smile Masters & Jaw Joint Matters voice assistant (timezone: ${
                timezone || "Asia/Kolkata"
              }). Greet them warmly in 1–2 short spoken sentences as Maya and ask how you can help.`,
            },
          ],
        },
      ],
      turnComplete: true,
    });
  } catch (err) {
    console.warn("[maya] kickoff send failed:", err);
  }

  // Cost/safety cap: 4 minutes max per session.
  timeLimitTimer = setTimeout(() => {
    try {
      session?.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [
              {
                text: "The call has reached its time limit. Say one brief warm goodbye and call end_call.",
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch {
      /* ignore */
    }
  }, 220_000);
  hardStopTimer = setTimeout(() => closeBoth("max_duration"), 240_000);

  clientWs.on("message", (raw) => {
    if (closed || !session) return;
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "audio" && typeof msg.data === "string" && msg.data.length > 0) {
      publish(call.id, "caller", msg.data, 16000);
      recorder.caller(msg.data);
      try {
        session.sendRealtimeInput({
          audio: {
            data: msg.data,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } catch {
        /* ignore if closing */
      }
    } else if (msg.type === "text" && typeof msg.text === "string" && msg.text.trim()) {
      const clean = msg.text.trim().slice(0, 600);
      db.appendTranscript(call.id, {
        role: "caller",
        text: clean,
        at: new Date().toISOString(),
        partial: false,
      });
      sendJson(clientWs, { type: "transcript", role: "caller", text: clean, finished: true });
      try {
        session.sendClientContent({
          turns: [{ role: "user", parts: [{ text: clean }] }],
          turnComplete: true,
        });
      } catch {
        /* ignore */
      }
    } else if (msg.type === "pointer" && typeof msg.text === "string" && msg.text.trim()) {
      try {
        session.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [
                {
                  text: `[Silent page context — do not announce unless asked] The visitor is currently viewing: "${msg.text
                    .trim()
                    .slice(0, 320)}".`,
                },
              ],
            },
          ],
          turnComplete: false,
        });
      } catch {
        /* ignore */
      }
    } else if (msg.type === "end") {
      closeBoth("client_end");
    }
  });

  clientWs.on("close", () => closeBoth("client_closed"));
  clientWs.on("error", () => closeBoth("client_error"));
}
