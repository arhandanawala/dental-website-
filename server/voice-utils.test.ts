import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LIVE_MODEL,
  FALLBACK_LIVE_MODEL,
  sanitizeEnvValue,
  buildModelCandidates,
  isModelUnsupportedClose,
  formatGeminiCloseError,
  decodeWsData,
  validateFunctionDeclarations,
} from "./voice-utils.js";
import { LIVE_FUNCTION_DECLARATIONS as SERVER_TOOLS } from "./prompt.js";
import worker, { LIVE_FUNCTION_DECLARATIONS as WORKER_TOOLS } from "../worker/index.js";

test("sanitizeEnvValue trims spaces, newlines, and matching surrounding quotes", () => {
  assert.equal(sanitizeEnvValue("  AIzaSyTestKey123 \n"), "AIzaSyTestKey123");
  assert.equal(sanitizeEnvValue('"AIzaSyQuotedKey"'), "AIzaSyQuotedKey");
  assert.equal(sanitizeEnvValue("'AIzaSySingleQuoted'"), "AIzaSySingleQuoted");
  assert.equal(sanitizeEnvValue("   "), "");
  assert.equal(sanitizeEnvValue(undefined), "");
});

test("buildModelCandidates preserves default primary and appends fallback once", () => {
  assert.deepEqual(buildModelCandidates(""), [DEFAULT_LIVE_MODEL, FALLBACK_LIVE_MODEL]);
  assert.deepEqual(buildModelCandidates(FALLBACK_LIVE_MODEL), [FALLBACK_LIVE_MODEL]);
  assert.deepEqual(buildModelCandidates(" custom-live-model "), [
    "custom-live-model",
    FALLBACK_LIVE_MODEL,
  ]);
});

test("isModelUnsupportedClose detects 1008/model errors but not auth or quota errors", () => {
  assert.equal(
    isModelUnsupportedClose(
      1008,
      "models/gemini-3.8-live is not found for API version v1beta, or is not supported for bidiGenerateContent."
    ),
    true
  );
  assert.equal(isModelUnsupportedClose(1008, ""), true);
  assert.equal(isModelUnsupportedClose(1008, "API key not valid. Please pass a valid API key."), false);
  assert.equal(isModelUnsupportedClose(1008, "Quota exceeded for quota metric"), false);
  assert.equal(isModelUnsupportedClose(1000, ""), false);
});

test("formatGeminiCloseError returns actionable messages for key, quota, and model failures", () => {
  const keyMsg = formatGeminiCloseError(1008, "API key not valid", DEFAULT_LIVE_MODEL);
  assert.match(keyMsg, /GEMINI_API_KEY was rejected/i);

  const quotaMsg = formatGeminiCloseError(1011, "RESOURCE_EXHAUSTED: quota exceeded", DEFAULT_LIVE_MODEL);
  assert.match(quotaMsg, /quota or billing/i);

  const modelMsg = formatGeminiCloseError(1008, "models/gemini-3.8-live is not found", DEFAULT_LIVE_MODEL);
  assert.match(modelMsg, /not available for this API key/i);
});

test("decodeWsData handles string, ArrayBuffer, and Uint8Array", () => {
  const enc = new TextEncoder();
  const bytes = enc.encode('{"setupComplete":{}}');
  assert.equal(decodeWsData('{"ok":true}'), '{"ok":true}');
  assert.equal(decodeWsData(bytes.buffer), '{"setupComplete":{}}');
  assert.equal(decodeWsData(bytes), '{"setupComplete":{}}');
  assert.equal(decodeWsData(null), null);
});

test("server and worker Gemini Live tool declarations contain zero empty OBJECT schemas", () => {
  assert.deepEqual(validateFunctionDeclarations(SERVER_TOOLS), []);
  assert.deepEqual(validateFunctionDeclarations(WORKER_TOOLS), []);
});

test("worker /api/voice/status trims GEMINI_API_KEY and reports fallbackModel", async () => {
  const resBlank = await worker.fetch(
    new Request("https://smilemaster.example.com/api/voice/status"),
    { GEMINI_API_KEY: "   " },
    { waitUntil() {} }
  );
  const dataBlank = await resBlank.json();
  assert.equal(dataBlank.configured, false);
  assert.equal(dataBlank.model, DEFAULT_LIVE_MODEL);
  assert.equal(dataBlank.fallbackModel, FALLBACK_LIVE_MODEL);

  const resValid = await worker.fetch(
    new Request("https://smilemaster.example.com/api/voice/status"),
    { GEMINI_API_KEY: ' "AIzaFakeKeyForUnitTest" \n' },
    { waitUntil() {} }
  );
  const dataValid = await resValid.json();
  assert.equal(dataValid.configured, true);
});
