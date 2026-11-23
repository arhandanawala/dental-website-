export const DEFAULT_LIVE_MODEL = "gemini-3.8-live";
export const FALLBACK_LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
export const DEFAULT_VOICE = "Zephyr";

export function sanitizeEnvValue(value) {
  if (typeof value !== "string") return "";
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function buildModelCandidates(configuredModel) {
  const primary = sanitizeEnvValue(configuredModel) || DEFAULT_LIVE_MODEL;
  const list = [primary];
  if (primary !== FALLBACK_LIVE_MODEL) {
    list.push(FALLBACK_LIVE_MODEL);
  }
  return list;
}

export function isModelUnsupportedClose(code, reason = "") {
  const text = String(reason || "");
  if (/api[_ ]?key|invalid.*key|unauthenticated|quota|billing|resource_exhausted/i.test(text)) {
    return false;
  }
  if (code === 1008) return true;
  return /not found|not supported|unknown model|invalid model|bidigeneratecontent/i.test(text);
}

export function formatGeminiCloseError(code, reason = "", model = DEFAULT_LIVE_MODEL) {
  const cleanReason = String(reason || "").trim();
  if (/api[_ ]?key|invalid.*key|unauthenticated|permission denied/i.test(cleanReason)) {
    return "Your GEMINI_API_KEY was rejected by Google Gemini. Create an unrestricted key at aistudio.google.com/apikey, set it as GEMINI_API_KEY in Cloudflare Worker Secrets, and redeploy.";
  }
  if (/quota|resource_exhausted|rate limit|billing/i.test(cleanReason)) {
    return "Gemini API quota or billing limit was reached for this key. Check your usage limits in Google AI Studio.";
  }
  if (isModelUnsupportedClose(code, cleanReason)) {
    return `Gemini Live model (${model}) is not available for this API key${cleanReason ? ` (${cleanReason.slice(0, 140)})` : ""}. Check your Google AI Studio key access or set GEMINI_LIVE_MODEL.`;
  }
  if (cleanReason) {
    return `Gemini Live closed (${code || "error"}): ${cleanReason.slice(0, 180)}`;
  }
  return `Voice AI connection closed before ready (code ${code || "unknown"}). Verify GEMINI_API_KEY in Cloudflare Worker Secrets and redeploy.`;
}

export function decodeWsData(data, decoder = new TextDecoder()) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return decoder.decode(data);
  if (ArrayBuffer.isView(data)) return decoder.decode(data);
  return null;
}

export function validateFunctionDeclarations(declarations) {
  const issues = [];
  for (const fn of declarations || []) {
    if (!fn?.name) {
      issues.push("Function declaration missing name");
      continue;
    }
    if (fn.parameters) {
      const typeStr = String(fn.parameters.type || "").toUpperCase();
      const props = fn.parameters.properties;
      if (typeStr === "OBJECT" && (!props || Object.keys(props).length === 0)) {
        issues.push(`Function "${fn.name}" has empty OBJECT parameters (invalid in Gemini Live API)`);
      }
    }
  }
  return issues;
}
