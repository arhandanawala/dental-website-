import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import * as db from "./db.js";

const COOKIE = "sm_admin";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const EPHEMERAL_SECRET = crypto.randomBytes(32).toString("hex");

function secret() {
  return process.env.SESSION_SECRET || EPHEMERAL_SECRET;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function unsign(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function safeEq(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function getConfiguredCredentials() {
  const envUser = process.env.ADMIN_USER;
  const envPass = process.env.ADMIN_PASSWORD;
  if (envUser && envPass) {
    return { source: "env", username: envUser, password: envPass, passwordHash: null };
  }
  const stored = db.getSetting("adminCredentials");
  if (stored?.username && stored?.passwordHash) {
    return {
      source: "store",
      username: String(stored.username),
      password: null,
      passwordHash: String(stored.passwordHash),
    };
  }
  return null;
}

function isHttpsRequest(req) {
  if (req.secure) return true;
  const proto = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  return proto === "https";
}

function setSessionCookie(req, res, token) {
  const https = isHttpsRequest(req);
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
    https ? "SameSite=None" : "SameSite=Lax",
  ];
  if (https) {
    parts.push("Secure", "Partitioned");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(req, res) {
  const https = isHttpsRequest(req);
  const parts = [
    `${COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    https ? "SameSite=None" : "SameSite=Lax",
  ];
  if (https) {
    parts.push("Secure", "Partitioned");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function extractBearer(req) {
  const h = req.headers?.authorization;
  if (typeof h === "string" && h.startsWith("Bearer ")) {
    return h.slice(7).trim();
  }
  return null;
}

function verifyCsrfForCookieMutation(req) {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (extractBearer(req)) return true;
  if (req.headers?.["x-requested-with"]) return true;

  const origin = req.headers?.origin;
  const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }
  return false;
}

export function authStatus(req, res) {
  const creds = getConfiguredCredentials();
  const session = readSession(req);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    configured: Boolean(creds),
    source: creds ? creds.source : "unclaimed",
    authenticated: Boolean(session?.sub),
    user: session?.sub || null,
  });
}

export function setupInitialAdmin(req, res) {
  if (getConfiguredCredentials()) {
    return res.status(409).json({ error: "Admin account is already configured." });
  }
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (username.length < 3 || username.length > 64) {
    return res.status(400).json({ error: "Username must be between 3 and 64 characters." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  db.setSetting("adminCredentials", {
    username,
    passwordHash,
    updatedAt: new Date().toISOString(),
  });
  const token = sign({ sub: username, exp: Date.now() + MAX_AGE_MS });
  setSessionCookie(req, res, token);
  return res.status(201).json({ ok: true, user: username, token });
}

export function login(req, res) {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const creds = getConfiguredCredentials();
  if (!creds) {
    return res.status(503).json({
      error: "Admin credentials have not been configured yet. Complete initial setup first.",
    });
  }

  const userOk = safeEq(username, creds.username);
  const passOk =
    creds.source === "env"
      ? safeEq(password, creds.password)
      : bcrypt.compareSync(password, creds.passwordHash);

  if (!userOk || !passOk) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = sign({ sub: creds.username, exp: Date.now() + MAX_AGE_MS });
  setSessionCookie(req, res, token);
  return res.json({ ok: true, user: creds.username, token });
}

export function logout(req, res) {
  clearSessionCookie(req, res);
  res.json({ ok: true });
}

export function updateCredentials(req, res) {
  const creds = getConfiguredCredentials();
  if (creds?.source === "env") {
    return res.status(400).json({
      error:
        "Credentials are controlled by server environment variables (ADMIN_USER / ADMIN_PASSWORD).",
    });
  }
  const currentPassword = String(req.body?.currentPassword || "");
  const newUsername = String(req.body?.username || creds?.username || "").trim();
  const newPassword = String(req.body?.newPassword || "");

  if (creds?.passwordHash && !bcrypt.compareSync(currentPassword, creds.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  if (newUsername.length < 3 || newUsername.length > 64) {
    return res.status(400).json({ error: "Username must be 3–64 characters." });
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.setSetting("adminCredentials", {
    username: newUsername,
    passwordHash,
    updatedAt: new Date().toISOString(),
  });
  const token = sign({ sub: newUsername, exp: Date.now() + MAX_AGE_MS });
  setSessionCookie(req, res, token);
  return res.json({ ok: true, user: newUsername, token });
}

export function readSession(req) {
  const bearer = extractBearer(req);
  if (bearer) {
    const parsed = unsign(bearer);
    if (parsed) return parsed;
  }
  const cookieToken = req.cookies?.[COOKIE];
  if (cookieToken) {
    return unsign(cookieToken);
  }
  return null;
}

export function requireAdmin(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (!verifyCsrfForCookieMutation(req)) {
    return res.status(403).json({ error: "Cross-site request blocked." });
  }
  req.admin = session;
  next();
}
