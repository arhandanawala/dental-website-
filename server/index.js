import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import * as db from "./db.js";
import * as cms from "./cms-store.js";
import * as cal from "./cal.js";
import * as auth from "./auth.js";
import { attachLiveSession, getVoiceStatus, probeVoiceHealth } from "./gemini-live.js";
import { MAYA_SYSTEM_PROMPT as defaultPromptText } from "./prompt.js";
import { subscribe } from "./livebus.js";

// Load local .env without overriding platform-injected environment variables (such as GEMINI_API_KEY).
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    clinic: process.env.CLINIC_NAME || "Smile Masters & Jaw Joint Matters",
    voice: getVoiceStatus(),
  });
});

app.get("/api/voice/status", (_req, res) => {
  res.json(getVoiceStatus());
});

app.get("/api/voice/probe", async (_req, res) => {
  res.json(await probeVoiceHealth());
});

// ---- Admin Auth ----
app.get("/api/auth/status", auth.authStatus);
app.post("/api/auth/setup", auth.setupInitialAdmin);
app.post("/api/login", auth.login);
app.post("/api/logout", auth.logout);
app.get("/api/me", (req, res) => {
  const session = auth.readSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: session.sub });
});
app.put("/api/admin/credentials", auth.requireAdmin, auth.updateCredentials);

// ---- Public CMS & Lead / Appointment Capture ----
app.get("/api/cms/public", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(cms.getPublicSnapshot());
});

app.post("/api/public/leads", (req, res) => {
  try {
    if (req.body?.company_website) {
      return res.status(200).json({ ok: true });
    }
    const lead = cms.createLead(req.body || {});
    res.status(201).json({ ok: true, lead });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid lead submission" });
  }
});

app.post("/api/public/appointments", (req, res) => {
  try {
    if (req.body?.company_website || req.body?.website) {
      return res.status(200).json({ ok: true });
    }
    const appointment = cms.createAppointment(req.body || {});
    res.status(201).json({ ok: true, appointment });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "Invalid appointment request" });
  }
});

// ---- Protected Admin CMS Endpoints ----
app.get("/api/admin/snapshot", auth.requireAdmin, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ...cms.getAdminSnapshot(),
    voice: {
      ...getVoiceStatus(),
      stats: db.stats(),
      calls: db.listCalls(),
    },
  });
});

app.post("/api/admin/seed-defaults", auth.requireAdmin, (_req, res) => {
  const result = cms.seedDefaults();
  res.json({ ok: true, ...result, snapshot: cms.getAdminSnapshot() });
});

app.put("/api/admin/site-content", auth.requireAdmin, (req, res) => {
  try {
    const siteContent = cms.updateSiteContent(req.body || {});
    res.json({ ok: true, siteContent });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to save content" });
  }
});

// Doctors
app.post("/api/admin/doctors", auth.requireAdmin, (req, res) => {
  try {
    const doctor = cms.upsertDoctor(req.body || {});
    res.status(201).json({ ok: true, doctor });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create doctor" });
  }
});

app.put("/api/admin/doctors/reorder", auth.requireAdmin, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (!ids.length) return res.status(400).json({ error: "Ordered IDs required" });
  const doctors = cms.reorderDoctors(ids);
  res.json({ ok: true, doctors });
});

app.put("/api/admin/doctors/:id", auth.requireAdmin, (req, res) => {
  try {
    const doctor = cms.upsertDoctor(req.body || {}, req.params.id);
    res.json({ ok: true, doctor });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update doctor" });
  }
});

app.delete("/api/admin/doctors/:id", auth.requireAdmin, (req, res) => {
  const deleted = cms.deleteDoctor(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Doctor not found" });
  res.json({ ok: true });
});

// Treatments
app.post("/api/admin/treatments", auth.requireAdmin, (req, res) => {
  try {
    const treatment = cms.upsertTreatment(req.body || {});
    res.status(201).json({ ok: true, treatment });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "Failed to create treatment" });
  }
});

app.put("/api/admin/treatments/reorder", auth.requireAdmin, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (!ids.length) return res.status(400).json({ error: "Ordered IDs required" });
  const treatments = cms.reorderTreatments(ids);
  res.json({ ok: true, treatments });
});

app.put("/api/admin/treatments/:id", auth.requireAdmin, (req, res) => {
  try {
    const treatment = cms.upsertTreatment(req.body || {}, req.params.id);
    res.json({ ok: true, treatment });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "Failed to update treatment" });
  }
});

app.delete("/api/admin/treatments/:id", auth.requireAdmin, (req, res) => {
  const deleted = cms.deleteTreatment(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Treatment not found" });
  res.json({ ok: true });
});

// Testimonials
app.post("/api/admin/testimonials", auth.requireAdmin, (req, res) => {
  try {
    const testimonial = cms.upsertTestimonial(req.body || {});
    res.status(201).json({ ok: true, testimonial });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "Failed to save testimonial" });
  }
});

app.put("/api/admin/testimonials/reorder", auth.requireAdmin, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (!ids.length) return res.status(400).json({ error: "Ordered IDs required" });
  const testimonials = cms.reorderTestimonials(ids);
  res.json({ ok: true, testimonials });
});

app.put("/api/admin/testimonials/:id", auth.requireAdmin, (req, res) => {
  try {
    const testimonial = cms.upsertTestimonial(req.body || {}, req.params.id);
    res.json({ ok: true, testimonial });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "Failed to update testimonial" });
  }
});

app.delete("/api/admin/testimonials/:id", auth.requireAdmin, (req, res) => {
  const deleted = cms.deleteTestimonial(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Testimonial not found" });
  res.json({ ok: true });
});

// Leads
app.patch("/api/admin/leads/:id", auth.requireAdmin, (req, res) => {
  try {
    const lead = cms.updateLead(req.params.id, req.body || {});
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json({ ok: true, lead });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update lead" });
  }
});

app.delete("/api/admin/leads/:id", auth.requireAdmin, (req, res) => {
  const deleted = cms.deleteLead(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Lead not found" });
  res.json({ ok: true });
});

// Appointments
app.patch("/api/admin/appointments/:id", auth.requireAdmin, (req, res) => {
  try {
    const appointment = cms.updateAppointment(req.params.id, req.body || {});
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json({ ok: true, appointment });
  } catch (err) {
    res
      .status(400)
      .json({ error: err instanceof Error ? err.message : "Failed to update appointment" });
  }
});

app.delete("/api/admin/appointments/:id", auth.requireAdmin, (req, res) => {
  const deleted = cms.deleteAppointment(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Appointment not found" });
  res.json({ ok: true });
});

// ---- Optional Cal.com Routes ----
app.get("/api/slots", async (req, res) => {
  try {
    const result = await cal.getSlots({
      timezone: req.query.timezone,
      daysAhead: req.query.days ? Number(req.query.days) : 7,
      preferredDate: req.query.date,
    });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/book", async (req, res) => {
  try {
    const booking = await cal.createBooking(req.body || {});
    res.json({ ok: true, booking });
  } catch (err) {
    const status = /required|valid|invalid/i.test(err.message) ? 400 : 502;
    res.status(status).json({ error: err.message });
  }
});

// ---- Voice AI Call Logs, Recordings & Prompt ----
app.get("/api/calls", auth.requireAdmin, (_req, res) => {
  res.json({ stats: db.stats(), calls: db.listCalls(), voice: getVoiceStatus() });
});

app.get("/api/calls/:id", auth.requireAdmin, (req, res) => {
  const call = db.getCall(req.params.id);
  if (!call) return res.status(404).json({ error: "Not found" });
  res.json(call);
});

app.get("/api/calls/:id/recording", (req, res) => {
  const tokenParam = typeof req.query.token === "string" ? req.query.token : "";
  const session = auth.readSession(req) || (tokenParam ? auth.unsign(tokenParam) : null);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  const call = db.getCall(req.params.id);
  if (!call) return res.status(404).json({ error: "Not found" });
  const file = path.join(root, "data", "recordings", `${call.id}.wav`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "No recording" });
  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Accept-Ranges", "bytes");
  res.sendFile(file);
});

app.get("/api/prompt", auth.requireAdmin, (_req, res) => {
  res.json({
    prompt: db.getSetting("systemPrompt") || defaultPromptText,
    overridden: Boolean(db.getSetting("systemPrompt")),
  });
});

app.put("/api/prompt", auth.requireAdmin, (req, res) => {
  const text = String(req.body?.prompt || "").trim();
  if (text.length < 40) return res.status(400).json({ error: "Prompt too short to be usable" });
  if (text.length > 20000) return res.status(400).json({ error: "Prompt too long (20k char cap)" });
  db.setSetting("systemPrompt", text);
  res.json({ ok: true, chars: text.length });
});

app.delete("/api/prompt", auth.requireAdmin, (_req, res) => {
  db.setSetting("systemPrompt", null);
  res.json({ ok: true });
});

// ---- Built Admin SPA ----
const adminDist = path.join(root, "dist", "admin");
if (fs.existsSync(adminDist)) {
  app.use("/admin", express.static(adminDist));
  app.get(/^\/admin\/.*/, (_req, res) => {
    res.sendFile(path.join(adminDist, "index.html"));
  });
} else {
  app.get(/^\/admin\/?$/, (_req, res) => {
    res
      .status(503)
      .type("html")
      .send(
        `<p>Admin UI is not built yet. Run <code>npm run build</code>. API is up on this port.</p>`
      );
  });
}

// Fence off private paths so nothing internal is served publicly.
const PRIVATE_PREFIXES = [
  "/data",
  "/server",
  "/src",
  "/dist",
  "/node_modules",
  "/.git",
  "/.env",
  "/vite.",
  "/tsconfig",
  "/dockerfile",
  "/.dockerignore",
  "/.gitignore",
  "/.nojekyll",
  "/firestore.rules",
  "/eslint.config.js",
  "/metadata.json",
  "/package.json",
  "/package-lock.json",
  "/worker",
  "/scripts",
  "/wrangler.jsonc",
];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (PRIVATE_PREFIXES.some((pre) => p === pre || p.startsWith(`${pre}/`))) {
    return res.status(404).end();
  }
  next();
});

app.use(
  express.static(root, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
  })
);

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const timezone = url.searchParams.get("timezone") || "Asia/Kolkata";
  attachLiveSession(socket, { timezone }).catch((err) => {
    try {
      socket.send(
        JSON.stringify({
          type: "error",
          message: err instanceof Error ? err.message : "Could not connect to Voice AI.",
        })
      );
    } catch {
      /* ignore */
    }
    socket.close();
  });
});

function upgradeCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return cookies;
}

const monitorWss = new WebSocketServer({ noServer: true });

monitorWss.on("connection", (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const tokenParam = url.searchParams.get("token");
  const session =
    auth.readSession({ cookies: upgradeCookies(req.headers.cookie) }) ||
    (tokenParam ? auth.unsign(tokenParam) : null);
  const callId = url.searchParams.get("callId");
  if (!session || !callId) {
    socket.close(4401, "Unauthorized");
    return;
  }
  const unsubscribe = subscribe(callId, (chunk) => {
    try {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(chunk));
    } catch {
      /* dead socket */
    }
  });
  socket.on("close", unsubscribe);
  socket.on("error", unsubscribe);
});

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname === "/ws/live") {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  } else if (pathname === "/ws/monitor") {
    monitorWss.handleUpgrade(req, socket, head, (ws) => monitorWss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Smile Masters & Jaw Joint Matters running on http://127.0.0.1:${PORT}`);
  console.log(`Admin CMS    http://127.0.0.1:${PORT}/admin`);
  console.log(`Voice Assist bottom-right assistant orb on the public site`);
});
