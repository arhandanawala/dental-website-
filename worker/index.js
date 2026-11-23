import {
  DEFAULT_CASE_GALLERY,
  DEFAULT_DOCTORS,
  DEFAULT_SITE_CONTENT,
  DEFAULT_TESTIMONIALS,
  DEFAULT_TREATMENTS,
  MAYA_SYSTEM_PROMPT_TEXT,
} from "../server/cms-defaults.js";

const COOKIE_NAME = "sm_admin";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_LIVE_MODEL = "gemini-3.8-live";
const DEFAULT_VOICE = "Zephyr";

// Pre-seeded PBKDF2-SHA256 (100,000 iterations) default clinic admin credential hash.
// Override in Cloudflare Workers Secrets with ADMIN_USER and ADMIN_PASSWORD.
const DEFAULT_ADMIN_AUTH = {
  username: "smilemaster",
  salt: "898c897be28903a77326f699c24458d3",
  hash: "40186bbd5d5e7e58f0ea685aecb3d124642a907f0446f622f4b4fbd588d5d0bb",
  iterations: 100000,
};

const LEAD_STATUSES = new Set(["New", "Contacted", "Follow-up", "Converted", "Closed"]);
const APPT_STATUSES = new Set(["Pending", "Confirmed", "Rescheduled", "Rejected", "Completed"]);

const enc = new TextEncoder();
const dec = new TextDecoder();

// Ephemeral fallback signing key per Worker isolate, initialized lazily inside a request handler
// (Cloudflare Workers disallows random generation in global module scope).
let fallbackSecret = null;

function getSigningSecret(env) {
  if (env?.SESSION_SECRET) return env.SESSION_SECRET;
  if (!fallbackSecret) {
    fallbackSecret = crypto.randomUUID() + "-" + crypto.randomUUID();
  }
  return fallbackSecret;
}

// In-memory state (automatically backed by env.SM_KV when a KV binding is configured).
let memState = null;

function createInitialState() {
  return {
    siteContent: structuredClone(DEFAULT_SITE_CONTENT),
    doctors: structuredClone(DEFAULT_DOCTORS),
    treatments: structuredClone(DEFAULT_TREATMENTS),
    testimonials: structuredClone(DEFAULT_TESTIMONIALS),
    testimonialsInitialized: true,
    leads: [],
    appointments: [],
    calls: [],
    systemPrompt: null,
    adminCredentials: { ...DEFAULT_ADMIN_AUTH },
  };
}

async function loadState(env) {
  if (env?.SM_KV) {
    try {
      const raw = await env.SM_KV.get("sm_state_v1", "json");
      if (raw && typeof raw === "object") {
        const rawReviews = Array.isArray(raw.testimonials) ? raw.testimonials : [];
        const testimonials =
          !raw.testimonialsInitialized && rawReviews.length === 0
            ? structuredClone(DEFAULT_TESTIMONIALS)
            : rawReviews;
        memState = {
          ...createInitialState(),
          ...raw,
          testimonials,
          testimonialsInitialized: true,
          siteContent: {
            ...DEFAULT_SITE_CONTENT,
            ...(raw.siteContent || {}),
            caseGalleryImages: Array.isArray(raw.siteContent?.caseGalleryImages)
              ? raw.siteContent.caseGalleryImages
              : structuredClone(DEFAULT_CASE_GALLERY),
          },
          adminCredentials: raw.adminCredentials || { ...DEFAULT_ADMIN_AUTH },
        };
        return memState;
      }
    } catch {
      /* fallback to memory */
    }
  }
  if (!memState) {
    memState = createInitialState();
  }
  return memState;
}

async function saveState(env, state) {
  memState = state;
  if (env?.SM_KV) {
    try {
      await env.SM_KV.put("sm_state_v1", JSON.stringify(state));
    } catch {
      /* ignore KV write errors */
    }
  }
}

function cleanText(val, maxLen = 500) {
  return String(val ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function cleanMultiline(val, maxLen = 3000) {
  return String(val ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLen);
}

function isSafeHref(url) {
  const s = String(url ?? "").trim();
  if (!s) return true;
  if (s.startsWith("#") || s.startsWith("/") || /^[a-z0-9._/-]+$/i.test(s)) return true;
  try {
    const u = new URL(s);
    return ["https:", "http:", "mailto:", "tel:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function isSafeImageSrc(src) {
  const s = String(src ?? "").trim();
  if (!s) return true;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(s)) {
    return s.length < 1_800_000;
  }
  if (/^(assets\/|\/assets\/)[a-z0-9._/-]+$/i.test(s) && !s.includes("..")) {
    return true;
  }
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function slugify(text) {
  return (
    cleanText(text, 100)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `item-${Date.now()}`
  );
}

function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncode(bytes) {
  let bin = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function safeEqStr(a, b) {
  const da = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(a || ""))));
  const db = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(b || ""))));
  return timingSafeEqualBytes(da, db);
}

async function pbkdf2Hex(password, salt, iterations = 100000) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations },
    key,
    256
  );
  return bytesToHex(bits);
}

async function signToken(payload, env) {
  const secret = getSigningSecret(env);
  const body = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${base64UrlEncode(sig)}`;
}

async function verifyToken(token, env) {
  if (!token || !token.includes(".")) return null;
  const [body, sigStr] = token.split(".");
  if (!body || !sigStr) return null;
  const secret = getSigningSecret(env);
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  let provided;
  try {
    provided = base64UrlDecode(sigStr);
  } catch {
    return null;
  }
  if (!timingSafeEqualBytes(expected, provided)) return null;
  try {
    const parsed = JSON.parse(dec.decode(base64UrlDecode(body)));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  const out = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

async function readSession(request, env) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const parsed = await verifyToken(authHeader.slice(7).trim(), env);
    if (parsed) return parsed;
  }
  const cookies = parseCookies(request);
  if (cookies[COOKIE_NAME]) {
    return verifyToken(cookies[COOKIE_NAME], env);
  }
  return null;
}

function verifyCsrf(request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if ((request.headers.get("authorization") || "").startsWith("Bearer ")) return true;
  if (request.headers.get("x-requested-with") === "XMLHttpRequest") return true;
  const origin = request.headers.get("origin");
  const host = new URL(request.url).host;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

function buildCookieHeader(token, request, clear = false) {
  const isHttps = new URL(request.url).protocol === "https:";
  const maxAge = clear ? 0 : Math.floor(SESSION_MAX_AGE_MS / 1000);
  const parts = [
    `${COOKIE_NAME}=${clear ? "" : encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${maxAge}`,
    isHttps ? "SameSite=None; Secure" : "SameSite=Lax",
  ];
  return parts.join("; ");
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

async function readJsonBody(request) {
  try {
    return (await request.json()) || {};
  } catch {
    return {};
  }
}

function getCallStats(calls) {
  const booked = calls.filter((c) => c.outcome === "booked").length;
  const notBooked = calls.filter((c) => c.outcome === "not_booked").length;
  return {
    total: calls.length,
    live: calls.filter((c) => c.status === "live").length,
    booked,
    notBooked,
    conversion: calls.length ? Math.round((booked / calls.length) * 100) : 0,
  };
}

function getVoiceStatus(env) {
  return {
    configured: Boolean(env?.GEMINI_API_KEY),
    model: env?.GEMINI_LIVE_MODEL || DEFAULT_LIVE_MODEL,
    voice: env?.GEMINI_VOICE || DEFAULT_VOICE,
  };
}

function getPublicSnapshot(state) {
  return {
    siteContent: { ...DEFAULT_SITE_CONTENT, ...(state.siteContent || {}) },
    doctors: [...state.doctors]
      .filter((d) => d.published !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    treatments: [...state.treatments]
      .filter((t) => t.published !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    testimonials: [...state.testimonials]
      .filter((t) => t.published !== false && t.consentConfirmed !== false)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
  };
}

function getAdminSnapshot(state, env) {
  return {
    siteContent: { ...DEFAULT_SITE_CONTENT, ...(state.siteContent || {}) },
    doctors: [...state.doctors].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    treatments: [...state.treatments].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    testimonials: [...state.testimonials].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    leads: [...state.leads].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    appointments: [...state.appointments].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    ),
    voice: {
      ...getVoiceStatus(env),
      stats: getCallStats(state.calls),
      calls: state.calls,
    },
  };
}

function buildMayaPrompt(state) {
  const snap = getPublicSnapshot(state);
  const base = state.systemPrompt || MAYA_SYSTEM_PROMPT_TEXT;
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

const LIVE_FUNCTION_DECLARATIONS = [
  {
    name: "get_clinic_details",
    description:
      "Retrieve up-to-date Smile Masters clinic address, phone, opening hours, published doctors, and treatments from the clinic CMS.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "request_appointment_callback",
    description:
      "Save a real appointment or consultation request directly into the Smile Masters clinic admin desk so the reception team can confirm the slot.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Patient full name" },
        phone: { type: "STRING", description: "Patient phone or WhatsApp number" },
        email: { type: "STRING", description: "Optional patient email address" },
        treatment: {
          type: "STRING",
          description: "Treatment or consultation type",
        },
        preferred_date: { type: "STRING", description: "Preferred date" },
        preferred_time: { type: "STRING", description: "Preferred time window" },
        notes: { type: "STRING", description: "Brief patient concern or extra context" },
      },
      required: ["name", "phone", "treatment"],
    },
  },
  {
    name: "save_call_outcome",
    description:
      "Record whether the caller requested an appointment, plus a brief summary of the call for the clinic desk.",
    parameters: {
      type: "OBJECT",
      properties: {
        booked: { type: "BOOLEAN" },
        summary: { type: "STRING" },
        patient_name: { type: "STRING" },
        patient_email: { type: "STRING" },
        patient_phone: { type: "STRING" },
        slot_start: { type: "STRING" },
      },
      required: ["booked", "summary"],
    },
  },
  {
    name: "end_call",
    description: "End the voice session cleanly after saying one warm goodbye line.",
    parameters: {
      type: "OBJECT",
      properties: {
        reason: { type: "STRING" },
      },
    },
  },
];

async function handleLiveWebSocket(request, env, ctx) {
  const apiKey = env?.GEMINI_API_KEY || "";
  const url = new URL(request.url);
  const timezone = url.searchParams.get("timezone") || "Asia/Kolkata";
  const model = env?.GEMINI_LIVE_MODEL || DEFAULT_LIVE_MODEL;
  const voiceName = env?.GEMINI_VOICE || DEFAULT_VOICE;

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  const sendToClient = (payload) => {
    try {
      server.send(JSON.stringify(payload));
    } catch {
      /* ignore closing socket */
    }
  };

  if (!apiKey) {
    sendToClient({
      type: "error",
      message:
        "Voice AI server key (GEMINI_API_KEY) is not configured yet in Cloudflare Worker Secrets. Please call +91 77389 68210 or use the appointment form.",
    });
    server.close(1011, "missing_api_key");
    return new Response(null, { status: 101, webSocket: client });
  }

  const state = await loadState(env);
  const call = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "live",
    outcome: "unknown",
    patientName: null,
    patientEmail: null,
    patientPhone: null,
    slotStart: null,
    summary: null,
    model,
    transcript: [],
    recording: false,
  };
  state.calls.unshift(call);
  if (state.calls.length > 50) state.calls.length = 50;
  ctx.waitUntil(saveState(env, state));

  const upstreamUrl = `https://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      headers: {
        Upgrade: "websocket",
        "User-Agent": "aistudio-build",
      },
    });
  } catch (err) {
    call.status = "completed";
    call.endedAt = new Date().toISOString();
    call.summary = `Connection failed: ${err?.message || String(err)}`;
    ctx.waitUntil(saveState(env, state));
    sendToClient({ type: "error", message: "Could not reach Gemini Live voice service." });
    server.close(1011, "upstream_failed");
    return new Response(null, { status: 101, webSocket: client });
  }

  const upstream = upstreamRes.webSocket;
  if (!upstream) {
    const errBody = await upstreamRes.text().catch(() => "");
    call.status = "completed";
    call.endedAt = new Date().toISOString();
    call.summary = `Upstream HTTP ${upstreamRes.status}`;
    ctx.waitUntil(saveState(env, state));
    sendToClient({
      type: "error",
      message: `Voice AI upstream returned ${upstreamRes.status}. ${errBody.slice(0, 120)}`,
    });
    server.close(1011, "upstream_rejected");
    return new Response(null, { status: 101, webSocket: client });
  }

  upstream.accept();

  let closed = false;
  const closeBoth = (reason) => {
    if (closed) return;
    closed = true;
    call.status = "completed";
    call.endedAt = new Date().toISOString();
    ctx.waitUntil(saveState(env, state));
    sendToClient({ type: "ended", reason: reason || "done" });
    try {
      upstream.close();
    } catch {
      /* ignore */
    }
    try {
      server.close();
    } catch {
      /* ignore */
    }
  };

  const appendTranscript = (role, text, partial = false) => {
    const last = call.transcript[call.transcript.length - 1];
    const nowIso = new Date().toISOString();
    const fresh = last && Date.now() - new Date(last.at).getTime() < 4000;
    if (last && last.role === role && fresh && partial) {
      last.text = (last.text || "") + text;
      last.at = nowIso;
    } else if (last && last.role === role && fresh && !partial && last.partial) {
      last.text = (last.text || "") + text;
      last.partial = false;
      last.at = nowIso;
    } else {
      call.transcript.push({ role, text, at: nowIso, partial: Boolean(partial) });
    }
  };

  const runTool = async (name, args) => {
    if (name === "get_clinic_details") {
      const snap = getPublicSnapshot(state);
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
      const appt = {
        id: crypto.randomUUID(),
        name: cleanText(args.name, 120) || "Voice Caller",
        phone: cleanText(args.phone, 40),
        email: cleanText(args.email, 160),
        treatment: cleanText(args.treatment, 160) || "General Consultation",
        preferredDate: cleanText(args.preferred_date, 60) || "Next available",
        preferredTime: cleanText(args.preferred_time, 60) || "Flexible",
        preferredContact: "Phone Call",
        message: cleanMultiline(args.notes || "Requested via Maya Voice Assistant", 1000),
        sourcePage: "Maya Voice Assistant",
        status: "Pending",
        notes: "",
        createdAt: new Date().toISOString(),
      };
      state.appointments.unshift(appt);
      call.outcome = "booked";
      call.patientName = appt.name;
      call.patientEmail = appt.email || null;
      call.patientPhone = appt.phone || null;
      call.slotStart = [appt.preferredDate, appt.preferredTime].filter(Boolean).join(" · ");
      call.summary = `${appt.treatment} — ${appt.message}`;
      ctx.waitUntil(saveState(env, state));
      return {
        ok: true,
        appointment: appt,
        message:
          "Appointment request saved to the Smile Masters Bandra West desk. Confirm the patient's details out loud and let them know our clinic team will reach out shortly to confirm their slot.",
      };
    }

    if (name === "save_call_outcome") {
      call.outcome = args.booked ? "booked" : "not_booked";
      call.summary = args.summary || call.summary;
      call.patientName = args.patient_name || call.patientName;
      call.patientEmail = args.patient_email || call.patientEmail;
      call.patientPhone = args.patient_phone || call.patientPhone;
      call.slotStart = args.slot_start || call.slotStart;
      ctx.waitUntil(saveState(env, state));
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
  };

  // Send Gemini Live setup frame.
  upstream.send(
    JSON.stringify({
      setup: {
        model: model.startsWith("models/") ? model : `models/${model}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: buildMayaPrompt(state) }],
        },
        tools: [{ functionDeclarations: LIVE_FUNCTION_DECLARATIONS }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    })
  );

  upstream.addEventListener("message", async (event) => {
    if (closed) return;
    let rawText;
    if (typeof event.data === "string") {
      rawText = event.data;
    } else if (event.data instanceof ArrayBuffer) {
      rawText = dec.decode(event.data);
    } else {
      return;
    }

    let msg;
    try {
      msg = JSON.parse(rawText);
    } catch {
      return;
    }

    if (msg.setupComplete) {
      sendToClient({ type: "ready", callId: call.id, model, voice: voiceName });
      upstream.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: `A visitor just connected to the Smile Masters & Jaw Joint Matters voice assistant (timezone: ${timezone}). Greet them warmly in 1–2 short spoken sentences as Maya and ask how you can help.`,
                  },
                ],
              },
            ],
            turnComplete: true,
          },
        })
      );
      return;
    }

    const sc = msg.serverContent;
    if (sc?.interrupted) {
      sendToClient({ type: "interrupted" });
    }

    if (sc?.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          sendToClient({
            type: "audio",
            mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
            data: part.inlineData.data,
          });
        }
        if (part.text && !part.thought) {
          appendTranscript("maya", part.text, false);
          sendToClient({ type: "transcript", role: "maya", text: part.text, finished: false });
        }
      }
    }

    if (sc?.inputTranscription?.text) {
      appendTranscript("caller", sc.inputTranscription.text, !sc.inputTranscription.finished);
      sendToClient({
        type: "transcript",
        role: "caller",
        text: sc.inputTranscription.text,
        finished: Boolean(sc.inputTranscription.finished),
      });
    }

    if (sc?.outputTranscription?.text) {
      appendTranscript("maya", sc.outputTranscription.text, !sc.outputTranscription.finished);
      sendToClient({
        type: "transcript",
        role: "maya",
        text: sc.outputTranscription.text,
        finished: Boolean(sc.outputTranscription.finished),
      });
    }

    if (sc?.turnComplete) {
      sendToClient({ type: "turnComplete" });
    }

    if (msg.toolCall?.functionCalls?.length) {
      const functionResponses = [];
      let endRequested = false;
      for (const fc of msg.toolCall.functionCalls) {
        let result;
        try {
          result = await runTool(fc.name, fc.args || {});
        } catch (err) {
          result = { ok: false, error: err?.message || String(err) };
        }
        sendToClient({ type: "tool", name: fc.name, result });
        if (fc.name === "end_call") endRequested = true;
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result },
        });
      }
      upstream.send(JSON.stringify({ toolResponse: { functionResponses } }));
      if (endRequested) {
        setTimeout(() => closeBoth("maya_hangup"), 2500);
      }
    }
  });

  upstream.addEventListener("close", () => closeBoth("gemini_closed"));
  upstream.addEventListener("error", () => {
    sendToClient({ type: "error", message: "Voice connection interrupted." });
    closeBoth("gemini_error");
  });

  server.addEventListener("message", (event) => {
    if (closed) return;
    let msg;
    try {
      msg = JSON.parse(typeof event.data === "string" ? event.data : dec.decode(event.data));
    } catch {
      return;
    }

    if (msg.type === "audio" && typeof msg.data === "string" && msg.data.length > 0) {
      upstream.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: msg.data,
              mimeType: "audio/pcm;rate=16000",
            },
          },
        })
      );
    } else if (msg.type === "text" && typeof msg.text === "string" && msg.text.trim()) {
      const clean = msg.text.trim().slice(0, 600);
      appendTranscript("caller", clean, false);
      sendToClient({ type: "transcript", role: "caller", text: clean, finished: true });
      upstream.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text: clean }] }],
            turnComplete: true,
          },
        })
      );
    } else if (msg.type === "end") {
      closeBoth("client_end");
    }
  });

  server.addEventListener("close", () => closeBoth("client_closed"));
  server.addEventListener("error", () => closeBoth("client_error"));

  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // ---- WebSocket Voice AI Endpoint ----
    if (pathname === "/ws/live" && request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      return handleLiveWebSocket(request, env, ctx);
    }

    // ---- API Routes ----
    if (pathname.startsWith("/api/")) {
      const state = await loadState(env);

      if (pathname === "/api/voice/status" && method === "GET") {
        return jsonResponse(getVoiceStatus(env));
      }

      if (pathname === "/api/cms/public" && method === "GET") {
        return jsonResponse(getPublicSnapshot(state));
      }

      if (pathname === "/api/public/leads" && method === "POST") {
        const body = await readJsonBody(request);
        if (body.company_website || body.website) return jsonResponse({ ok: true });
        const name = cleanText(body.name, 120);
        const phone = cleanText(body.phone, 40);
        if (name.length < 2) return jsonResponse({ error: "Please enter your full name." }, 400);
        if (phone.replace(/\D/g, "").length < 7) {
          return jsonResponse({ error: "Please enter a valid phone number." }, 400);
        }
        const lead = {
          id: crypto.randomUUID(),
          name,
          phone,
          email: cleanText(body.email, 160),
          treatment: cleanText(body.treatment, 160) || "General Enquiry",
          message: cleanMultiline(body.message, 1500),
          sourcePage: cleanText(body.sourcePage, 120) || "Website Form",
          status: "New",
          notes: "",
          createdAt: new Date().toISOString(),
        };
        state.leads.unshift(lead);
        await saveState(env, state);
        return jsonResponse({ ok: true, lead }, 201);
      }

      if (pathname === "/api/public/appointments" && method === "POST") {
        const body = await readJsonBody(request);
        if (body.company_website || body.website) return jsonResponse({ ok: true });
        const name = cleanText(body.name, 120);
        const phone = cleanText(body.phone, 40);
        const treatment = cleanText(body.treatment, 160);
        if (name.length < 2) return jsonResponse({ error: "Please enter your full name." }, 400);
        if (phone.replace(/\D/g, "").length < 7) {
          return jsonResponse({ error: "Please enter a valid phone number." }, 400);
        }
        if (!treatment) return jsonResponse({ error: "Please select a treatment or consultation." }, 400);
        const appointment = {
          id: crypto.randomUUID(),
          name,
          phone,
          email: cleanText(body.email, 160),
          treatment,
          preferredDate: cleanText(body.preferredDate, 60) || "Next available",
          preferredTime: cleanText(body.preferredTime, 60) || "Flexible",
          preferredContact: cleanText(body.preferredContact, 60) || "Phone Call",
          message: cleanMultiline(body.message, 1500),
          sourcePage: cleanText(body.sourcePage, 120) || "Website Booking Form",
          status: "Pending",
          notes: "",
          createdAt: new Date().toISOString(),
        };
        state.appointments.unshift(appointment);
        await saveState(env, state);
        return jsonResponse({ ok: true, appointment }, 201);
      }

      // ---- Auth Endpoints ----
      if (pathname === "/api/auth/status" && method === "GET") {
        const session = await readSession(request, env);
        const envControlled = Boolean(env?.ADMIN_USER && env?.ADMIN_PASSWORD);
        return jsonResponse({
          configured: true,
          source: envControlled ? "env" : "stored",
          authenticated: Boolean(session?.sub),
          user: session?.sub || null,
        });
      }

      if (pathname === "/api/login" && method === "POST") {
        const body = await readJsonBody(request);
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        const envUser = env?.ADMIN_USER;
        const envPass = env?.ADMIN_PASSWORD;

        let valid = false;
        let canonicalUser = "";
        if (envUser && envPass) {
          canonicalUser = envUser;
          valid = (await safeEqStr(username, envUser)) && (await safeEqStr(password, envPass));
        } else {
          const creds = state.adminCredentials || DEFAULT_ADMIN_AUTH;
          canonicalUser = creds.username;
          const userOk = await safeEqStr(username, creds.username);
          const derived = await pbkdf2Hex(password, creds.salt, creds.iterations || 100000);
          const passOk = await safeEqStr(derived, creds.hash);
          valid = userOk && passOk;
        }

        if (!valid) {
          return jsonResponse({ error: "Invalid username or password." }, 401);
        }

        const token = await signToken(
          { sub: canonicalUser, exp: Date.now() + SESSION_MAX_AGE_MS },
          env
        );
        return jsonResponse(
          { ok: true, user: canonicalUser, token },
          200,
          { "Set-Cookie": buildCookieHeader(token, request, false) }
        );
      }

      if (pathname === "/api/logout" && method === "POST") {
        return jsonResponse(
          { ok: true },
          200,
          { "Set-Cookie": buildCookieHeader("", request, true) }
        );
      }

      // ---- Protected Admin Endpoints ----
      const session = await readSession(request, env);
      if (!session) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      if (!verifyCsrf(request)) {
        return jsonResponse({ error: "Cross-site request blocked." }, 403);
      }

      if (pathname === "/api/me" && method === "GET") {
        return jsonResponse({ user: session.sub });
      }

      if (pathname === "/api/admin/credentials" && method === "PUT") {
        if (env?.ADMIN_USER && env?.ADMIN_PASSWORD) {
          return jsonResponse(
            {
              error:
                "Credentials are controlled by Cloudflare Worker Secrets (ADMIN_USER / ADMIN_PASSWORD).",
            },
            400
          );
        }
        const body = await readJsonBody(request);
        const creds = state.adminCredentials || DEFAULT_ADMIN_AUTH;
        const currentDerived = await pbkdf2Hex(
          String(body.currentPassword || ""),
          creds.salt,
          creds.iterations || 100000
        );
        if (!(await safeEqStr(currentDerived, creds.hash))) {
          return jsonResponse({ error: "Current password is incorrect." }, 401);
        }
        const newUsername = String(body.username || creds.username).trim();
        const newPassword = String(body.newPassword || "");
        if (newUsername.length < 3 || newUsername.length > 64) {
          return jsonResponse({ error: "Username must be 3–64 characters." }, 400);
        }
        if (newPassword.length < 8 || newPassword.length > 128) {
          return jsonResponse({ error: "New password must be at least 8 characters." }, 400);
        }
        const newSaltBytes = new Uint8Array(16);
        crypto.getRandomValues(newSaltBytes);
        const newSalt = bytesToHex(newSaltBytes);
        const newHash = await pbkdf2Hex(newPassword, newSalt, 100000);
        state.adminCredentials = {
          username: newUsername,
          salt: newSalt,
          hash: newHash,
          iterations: 100000,
        };
        await saveState(env, state);
        const token = await signToken(
          { sub: newUsername, exp: Date.now() + SESSION_MAX_AGE_MS },
          env
        );
        return jsonResponse(
          { ok: true, user: newUsername, token },
          200,
          { "Set-Cookie": buildCookieHeader(token, request, false) }
        );
      }

      if (pathname === "/api/admin/snapshot" && method === "GET") {
        return jsonResponse(getAdminSnapshot(state, env));
      }

      if (pathname === "/api/admin/seed-defaults" && method === "POST") {
        let created = 0;
        for (const doc of DEFAULT_DOCTORS) {
          if (!state.doctors.some((d) => d.id === doc.id)) {
            state.doctors.push(structuredClone(doc));
            created++;
          }
        }
        for (const tr of DEFAULT_TREATMENTS) {
          if (!state.treatments.some((t) => t.id === tr.id)) {
            state.treatments.push(structuredClone(tr));
            created++;
          }
        }
        for (const rev of DEFAULT_TESTIMONIALS) {
          if (!state.testimonials.some((r) => r.id === rev.id)) {
            state.testimonials.push(structuredClone(rev));
            created++;
          }
        }
        state.testimonialsInitialized = true;
        state.siteContent = {
          ...DEFAULT_SITE_CONTENT,
          ...(state.siteContent || {}),
          caseGalleryImages:
            Array.isArray(state.siteContent?.caseGalleryImages) &&
            state.siteContent.caseGalleryImages.length > 0
              ? state.siteContent.caseGalleryImages
              : structuredClone(DEFAULT_CASE_GALLERY),
        };
        await saveState(env, state);
        return jsonResponse({
          ok: true,
          created,
          snapshot: getAdminSnapshot(state, env),
        });
      }

      if (pathname === "/api/admin/site-content" && method === "PUT") {
        const body = await readJsonBody(request);
        const next = { ...state.siteContent };
        const strFields = [
          "clinicName",
          "tagline",
          "foundedYear",
          "logoAlt",
          "phone",
          "whatsappNumber",
          "email",
          "address",
          "city",
          "openingHours",
          "heroEyebrow",
          "heroHeadline",
          "heroMobileHeadline",
          "heroDescription",
          "heroCtaText",
          "heroSecondaryCtaText",
          "aboutEyebrow",
          "aboutHeadline",
          "aboutDescription",
          "doctorsSectionTitle",
          "doctorsSectionSubtitle",
          "treatmentsSectionTitle",
          "treatmentsSectionSubtitle",
          "testimonialsSectionEyebrow",
          "testimonialsSectionTitle",
          "testimonialsSectionNote",
          "bookingNotice",
          "footerDescription",
          "notificationEmail",
        ];
        for (const f of strFields) {
          if (f in body) next[f] = cleanMultiline(body[f], 2000);
        }
        for (const lf of [
          "heroCtaLink",
          "heroSecondaryCtaLink",
          "googleMapsUrl",
          "socialInstagram",
          "socialFacebook",
          "socialYoutube",
          "socialLinkedin",
        ]) {
          if (lf in body && isSafeHref(body[lf])) next[lf] = String(body[lf] || "").trim();
        }
        for (const imgf of ["logoUrl", "heroDesktopImage", "heroMobileImage"]) {
          if (imgf in body && isSafeImageSrc(body[imgf])) {
            next[imgf] = String(body[imgf] || "").trim();
          }
        }
        if ("notifyOnNewLead" in body) next.notifyOnNewLead = Boolean(body.notifyOnNewLead);
        if ("notifyOnNewAppointment" in body) {
          next.notifyOnNewAppointment = Boolean(body.notifyOnNewAppointment);
        }
        if (Array.isArray(body.faqs)) {
          next.faqs = body.faqs
            .slice(0, 30)
            .map((f) => ({
              question: cleanText(f?.question, 300),
              answer: cleanMultiline(f?.answer, 1500),
            }))
            .filter((f) => f.question && f.answer);
        }
        if (Array.isArray(body.caseGalleryImages)) {
          next.caseGalleryImages = body.caseGalleryImages
            .slice(0, 18)
            .map((item, idx) => ({
              id: cleanText(item?.id, 80) || `case-${idx + 1}`,
              imageUrl: String(item?.imageUrl ?? "").trim(),
              caption: cleanText(item?.caption, 180) || `Smile transformation ${idx + 1}`,
            }))
            .filter((item) => item.imageUrl && isSafeImageSrc(item.imageUrl));
        }
        state.siteContent = next;
        await saveState(env, state);
        return jsonResponse({ ok: true, siteContent: next });
      }

      // Doctors CRUD
      if (pathname === "/api/admin/doctors" && method === "POST") {
        const body = await readJsonBody(request);
        const name = cleanText(body.name, 140);
        if (name.length < 2) return jsonResponse({ error: "Doctor name is required." }, 400);
        if (!isSafeImageSrc(body.photoUrl)) {
          return jsonResponse({ error: "Invalid doctor photo URL." }, 400);
        }
        const doctor = {
          id: slugify(body.id || name),
          name,
          credentials: cleanText(body.credentials, 180),
          role: cleanText(body.role, 180),
          bio: cleanMultiline(body.bio, 2500),
          specializations: Array.isArray(body.specializations)
            ? body.specializations.map((s) => cleanText(s, 80)).filter(Boolean)
            : [],
          experience: cleanText(body.experience, 200),
          photoUrl: String(body.photoUrl || "").trim(),
          published: body.published !== false,
          sortOrder: Number(body.sortOrder) || state.doctors.length + 1,
        };
        state.doctors.push(doctor);
        await saveState(env, state);
        return jsonResponse({ ok: true, doctor }, 201);
      }

      if (pathname === "/api/admin/doctors/reorder" && method === "PUT") {
        const body = await readJsonBody(request);
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        ids.forEach((id, idx) => {
          const item = state.doctors.find((d) => d.id === id);
          if (item) item.sortOrder = idx + 1;
        });
        await saveState(env, state);
        return jsonResponse({ ok: true, doctors: state.doctors });
      }

      if (pathname.startsWith("/api/admin/doctors/")) {
        const id = decodeURIComponent(pathname.slice("/api/admin/doctors/".length));
        if (method === "PUT") {
          const body = await readJsonBody(request);
          const idx = state.doctors.findIndex((d) => d.id === id);
          if (idx === -1) return jsonResponse({ error: "Doctor not found" }, 404);
          if ("photoUrl" in body && !isSafeImageSrc(body.photoUrl)) {
            return jsonResponse({ error: "Invalid doctor photo URL." }, 400);
          }
          state.doctors[idx] = {
            ...state.doctors[idx],
            ...("name" in body ? { name: cleanText(body.name, 140) } : {}),
            ...("credentials" in body ? { credentials: cleanText(body.credentials, 180) } : {}),
            ...("role" in body ? { role: cleanText(body.role, 180) } : {}),
            ...("bio" in body ? { bio: cleanMultiline(body.bio, 2500) } : {}),
            ...("specializations" in body && Array.isArray(body.specializations)
              ? { specializations: body.specializations.map((s) => cleanText(s, 80)).filter(Boolean) }
              : {}),
            ...("experience" in body ? { experience: cleanText(body.experience, 200) } : {}),
            ...("photoUrl" in body ? { photoUrl: String(body.photoUrl || "").trim() } : {}),
            ...("published" in body ? { published: Boolean(body.published) } : {}),
            ...("sortOrder" in body ? { sortOrder: Number(body.sortOrder) || idx + 1 } : {}),
          };
          await saveState(env, state);
          return jsonResponse({ ok: true, doctor: state.doctors[idx] });
        }
        if (method === "DELETE") {
          state.doctors = state.doctors.filter((d) => d.id !== id);
          await saveState(env, state);
          return jsonResponse({ ok: true });
        }
      }

      // Treatments CRUD
      if (pathname === "/api/admin/treatments" && method === "POST") {
        const body = await readJsonBody(request);
        const title = cleanText(body.title, 160);
        if (title.length < 2) return jsonResponse({ error: "Treatment title is required." }, 400);
        if (!isSafeImageSrc(body.imageUrl)) {
          return jsonResponse({ error: "Invalid treatment image URL." }, 400);
        }
        const treatment = {
          id: slugify(body.id || title),
          slug: slugify(body.slug || title),
          title,
          category: cleanText(body.category, 100) || "TMJ & Jaw Joint Care",
          shortDescription: cleanMultiline(body.shortDescription, 500),
          fullDescription: cleanMultiline(body.fullDescription, 2500),
          highlights: Array.isArray(body.highlights)
            ? body.highlights.map((h) => cleanText(h, 140)).filter(Boolean)
            : [],
          imageUrl: String(body.imageUrl || "").trim(),
          published: body.published !== false,
          sortOrder: Number(body.sortOrder) || state.treatments.length + 1,
        };
        state.treatments.push(treatment);
        await saveState(env, state);
        return jsonResponse({ ok: true, treatment }, 201);
      }

      if (pathname === "/api/admin/treatments/reorder" && method === "PUT") {
        const body = await readJsonBody(request);
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        ids.forEach((id, idx) => {
          const item = state.treatments.find((t) => t.id === id);
          if (item) item.sortOrder = idx + 1;
        });
        await saveState(env, state);
        return jsonResponse({ ok: true, treatments: state.treatments });
      }

      if (pathname.startsWith("/api/admin/treatments/")) {
        const id = decodeURIComponent(pathname.slice("/api/admin/treatments/".length));
        if (method === "PUT") {
          const body = await readJsonBody(request);
          const idx = state.treatments.findIndex((t) => t.id === id);
          if (idx === -1) return jsonResponse({ error: "Treatment not found" }, 404);
          if ("imageUrl" in body && !isSafeImageSrc(body.imageUrl)) {
            return jsonResponse({ error: "Invalid treatment image URL." }, 400);
          }
          state.treatments[idx] = {
            ...state.treatments[idx],
            ...("title" in body ? { title: cleanText(body.title, 160) } : {}),
            ...("category" in body ? { category: cleanText(body.category, 100) } : {}),
            ...("shortDescription" in body
              ? { shortDescription: cleanMultiline(body.shortDescription, 500) }
              : {}),
            ...("fullDescription" in body
              ? { fullDescription: cleanMultiline(body.fullDescription, 2500) }
              : {}),
            ...("highlights" in body && Array.isArray(body.highlights)
              ? { highlights: body.highlights.map((h) => cleanText(h, 140)).filter(Boolean) }
              : {}),
            ...("imageUrl" in body ? { imageUrl: String(body.imageUrl || "").trim() } : {}),
            ...("published" in body ? { published: Boolean(body.published) } : {}),
            ...("sortOrder" in body ? { sortOrder: Number(body.sortOrder) || idx + 1 } : {}),
          };
          await saveState(env, state);
          return jsonResponse({ ok: true, treatment: state.treatments[idx] });
        }
        if (method === "DELETE") {
          state.treatments = state.treatments.filter((t) => t.id !== id);
          await saveState(env, state);
          return jsonResponse({ ok: true });
        }
      }

      // Testimonials CRUD
      if (pathname === "/api/admin/testimonials" && method === "POST") {
        const body = await readJsonBody(request);
        const reviewerName = cleanText(body.reviewerName || body.author, 120);
        const quote = cleanMultiline(body.quote || "", 1500);
        const imageUrl = String(body.imageUrl || "").trim();
        if (imageUrl && !isSafeImageSrc(imageUrl)) {
          return jsonResponse({ error: "Invalid review image URL." }, 400);
        }
        if (!reviewerName) {
          return jsonResponse({ error: "Reviewer name or title is required." }, 400);
        }
        if (quote.length < 5 && !imageUrl) {
          return jsonResponse(
            { error: "Please enter a quote (5+ chars) or upload a review image." },
            400
          );
        }
        const consentConfirmed = Boolean(body.consentConfirmed ?? body.verifiedConsent ?? true);
        const testimonial = {
          id: crypto.randomUUID(),
          reviewerName,
          reviewerContext: cleanText(body.reviewerContext || body.treatment, 160),
          quote,
          rating: Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5))),
          source: cleanText(body.source || "Verified Patient", 80),
          imageUrl,
          consentConfirmed,
          published: Boolean(body.published && consentConfirmed),
          sortOrder: Number(body.sortOrder) || state.testimonials.length + 1,
        };
        state.testimonials.push(testimonial);
        state.testimonialsInitialized = true;
        await saveState(env, state);
        return jsonResponse({ ok: true, testimonial }, 201);
      }

      if (pathname === "/api/admin/testimonials/reorder" && method === "PUT") {
        const body = await readJsonBody(request);
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        ids.forEach((id, idx) => {
          const item = state.testimonials.find((t) => t.id === id);
          if (item) item.sortOrder = idx + 1;
        });
        await saveState(env, state);
        return jsonResponse({ ok: true, testimonials: state.testimonials });
      }

      if (pathname.startsWith("/api/admin/testimonials/")) {
        const id = decodeURIComponent(pathname.slice("/api/admin/testimonials/".length));
        if (method === "PUT") {
          const body = await readJsonBody(request);
          const idx = state.testimonials.findIndex((t) => t.id === id);
          if (idx === -1) return jsonResponse({ error: "Testimonial not found" }, 404);
          if ("imageUrl" in body && !isSafeImageSrc(body.imageUrl)) {
            return jsonResponse({ error: "Invalid review image URL." }, 400);
          }
          const cur = state.testimonials[idx];
          const consent =
            "consentConfirmed" in body
              ? Boolean(body.consentConfirmed)
              : "verifiedConsent" in body
                ? Boolean(body.verifiedConsent)
                : Boolean(cur.consentConfirmed);
          state.testimonials[idx] = {
            ...cur,
            ...("reviewerName" in body
              ? { reviewerName: cleanText(body.reviewerName, 120) }
              : "author" in body
                ? { reviewerName: cleanText(body.author, 120) }
                : {}),
            ...("reviewerContext" in body
              ? { reviewerContext: cleanText(body.reviewerContext, 160) }
              : "treatment" in body
                ? { reviewerContext: cleanText(body.treatment, 160) }
                : {}),
            ...("quote" in body ? { quote: cleanMultiline(body.quote, 1500) } : {}),
            ...("rating" in body
              ? { rating: Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5))) }
              : {}),
            ...("source" in body ? { source: cleanText(body.source, 80) } : {}),
            ...("imageUrl" in body ? { imageUrl: String(body.imageUrl || "").trim() } : {}),
            consentConfirmed: consent,
            published:
              consent && ("published" in body ? Boolean(body.published) : Boolean(cur.published)),
          };
          await saveState(env, state);
          return jsonResponse({ ok: true, testimonial: state.testimonials[idx] });
        }
        if (method === "DELETE") {
          state.testimonials = state.testimonials.filter((t) => t.id !== id);
          state.testimonialsInitialized = true;
          await saveState(env, state);
          return jsonResponse({ ok: true });
        }
      }

      // Leads & Appointments updates
      if (pathname.startsWith("/api/admin/leads/")) {
        const id = decodeURIComponent(pathname.slice("/api/admin/leads/".length));
        const idx = state.leads.findIndex((l) => l.id === id);
        if (idx === -1) return jsonResponse({ error: "Lead not found" }, 404);
        if (method === "PATCH") {
          const body = await readJsonBody(request);
          if (body.status && LEAD_STATUSES.has(body.status)) state.leads[idx].status = body.status;
          if ("notes" in body) state.leads[idx].notes = cleanMultiline(body.notes, 2000);
          await saveState(env, state);
          return jsonResponse({ ok: true, lead: state.leads[idx] });
        }
        if (method === "DELETE") {
          state.leads.splice(idx, 1);
          await saveState(env, state);
          return jsonResponse({ ok: true });
        }
      }

      if (pathname.startsWith("/api/admin/appointments/")) {
        const id = decodeURIComponent(pathname.slice("/api/admin/appointments/".length));
        const idx = state.appointments.findIndex((a) => a.id === id);
        if (idx === -1) return jsonResponse({ error: "Appointment not found" }, 404);
        if (method === "PATCH") {
          const body = await readJsonBody(request);
          if (body.status && APPT_STATUSES.has(body.status)) {
            state.appointments[idx].status = body.status;
          }
          if ("notes" in body) state.appointments[idx].notes = cleanMultiline(body.notes, 2000);
          if ("preferredDate" in body) {
            state.appointments[idx].preferredDate = cleanText(body.preferredDate, 60);
          }
          if ("preferredTime" in body) {
            state.appointments[idx].preferredTime = cleanText(body.preferredTime, 60);
          }
          await saveState(env, state);
          return jsonResponse({ ok: true, appointment: state.appointments[idx] });
        }
        if (method === "DELETE") {
          state.appointments.splice(idx, 1);
          await saveState(env, state);
          return jsonResponse({ ok: true });
        }
      }

      // Voice AI admin endpoints
      if (pathname === "/api/calls" && method === "GET") {
        return jsonResponse(state.calls);
      }

      if (pathname === "/api/stats" && method === "GET") {
        return jsonResponse(getCallStats(state.calls));
      }

      if (pathname === "/api/prompt") {
        if (method === "GET") {
          return jsonResponse({
            prompt: state.systemPrompt || MAYA_SYSTEM_PROMPT_TEXT,
            isCustom: Boolean(state.systemPrompt),
            defaultPrompt: MAYA_SYSTEM_PROMPT_TEXT,
          });
        }
        if (method === "PUT") {
          const body = await readJsonBody(request);
          const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
          state.systemPrompt = prompt ? prompt.slice(0, 12000) : null;
          await saveState(env, state);
          return jsonResponse({
            ok: true,
            prompt: state.systemPrompt || MAYA_SYSTEM_PROMPT_TEXT,
            isCustom: Boolean(state.systemPrompt),
          });
        }
      }

      return jsonResponse({ error: "Not found" }, 404);
    }

    // ---- Admin SPA Route Handling ----
    if (pathname === "/admin") {
      return Response.redirect(new URL("/admin/", request.url), 302);
    }

    if (pathname.startsWith("/admin/")) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) return assetRes;
      return env.ASSETS.fetch(new Request(new URL("/admin/index.html", request.url), request));
    }

    // ---- Public Static Website ----
    return env.ASSETS.fetch(request);
  },
};
