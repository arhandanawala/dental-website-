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
  decodeWsDataAsync,
  pickDiscoveredLiveModels,
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
  assert.equal(isModelUnsupportedClose(1007, "API key not valid. Please pass a valid API key."), false);
  assert.equal(isModelUnsupportedClose(1008, "API key not valid. Please pass a valid API key."), false);
  assert.equal(isModelUnsupportedClose(1008, "Quota exceeded for quota metric"), false);
  assert.equal(isModelUnsupportedClose(1000, ""), false);
});

test("formatGeminiCloseError returns actionable messages for key, quota, and model failures", () => {
  const keyMsg = formatGeminiCloseError(1007, "API key not valid", DEFAULT_LIVE_MODEL);
  assert.match(keyMsg, /GEMINI_API_KEY was rejected/i);

  const quotaMsg = formatGeminiCloseError(1011, "RESOURCE_EXHAUSTED: quota exceeded", DEFAULT_LIVE_MODEL);
  assert.match(quotaMsg, /quota or billing/i);

  const modelMsg = formatGeminiCloseError(1008, "models/gemini-3.8-live is not found", DEFAULT_LIVE_MODEL);
  assert.match(modelMsg, /not available for this API key/i);
});

test("decodeWsData and decodeWsDataAsync handle string, ArrayBuffer, Uint8Array, and Blob", async () => {
  const enc = new TextEncoder();
  const bytes = enc.encode('{"setupComplete":{}}');
  assert.equal(decodeWsData('{"ok":true}'), '{"ok":true}');
  assert.equal(decodeWsData(bytes.buffer), '{"setupComplete":{}}');
  assert.equal(decodeWsData(bytes), '{"setupComplete":{}}');
  assert.equal(decodeWsData(null), null);
  const fakeBlob = { text: async () => '{"blob":true}' };
  assert.equal(await decodeWsDataAsync(fakeBlob), '{"blob":true}');
});

test("pickDiscoveredLiveModels ranks bidiGenerateContent models and skips already-tried or non-chat models", () => {
  const payload = {
    models: [
      { name: "models/gemini-3.5-transcribe-live", supportedGenerationMethods: ["bidiGenerateContent"] },
      { name: "models/gemini-3.5-live-translate-preview", supportedGenerationMethods: ["bidiGenerateContent"] },
      { name: "models/gemini-3.8-live", supportedGenerationMethods: ["bidiGenerateContent"] },
      { name: "models/gemini-2.5-flash-native-audio-preview-09-2025", supportedGenerationMethods: ["bidiGenerateContent"] },
      { name: "models/gemini-2.5-flash-native-audio-preview-12-2025", supportedGenerationMethods: ["bidiGenerateContent"] },
      { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
    ],
  };

  assert.deepEqual(pickDiscoveredLiveModels(payload, [DEFAULT_LIVE_MODEL, FALLBACK_LIVE_MODEL]), [
    "gemini-2.5-flash-native-audio-preview-09-2025",
  ]);
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

test("worker handleLiveWebSocket registers listeners BEFORE accept() and falls back on 1008", async () => {
  class MockSocket {
    listeners: Record<string, Array<(ev: unknown) => void>> = {};
    accepted = false;
    sent: string[] = [];
    closed = false;
    onAccept?: () => void;
    onSend?: (data: string) => void;
    addEventListener(type: string, fn: (ev: unknown) => void) {
      this.listeners[type] ||= [];
      this.listeners[type].push(fn);
    }
    emit(type: string, ev: unknown) {
      for (const fn of this.listeners[type] || []) fn(ev);
    }
    accept() {
      // Assert listeners are ALREADY attached before accept()!
      assert.ok((this.listeners["message"]?.length || 0) > 0, "message listener must be registered before accept()");
      assert.ok((this.listeners["close"]?.length || 0) > 0, "close listener must be registered before accept()");
      this.accepted = true;
      this.onAccept?.();
    }
    send(data: string) {
      this.sent.push(data);
      this.onSend?.(data);
    }
    close() {
      this.closed = true;
    }
  }

  let serverSocket!: MockSocket;
  const origWebSocketPair = (globalThis as Record<string, unknown>).WebSocketPair;
  const origFetch = globalThis.fetch;
  const origResponse = globalThis.Response;

  const waitPromises: Promise<unknown>[] = [];
  let attemptCount = 0;

  try {
    (globalThis as Record<string, unknown>).WebSocketPair = class {
      0 = new MockSocket();
      1 = (serverSocket = new MockSocket());
    };
    // Node's Response rejects status 101, so stub Cloudflare's 101 Response constructor for the test.
    (globalThis as Record<string, unknown>).Response = class {
      status: number;
      webSocket: unknown;
      constructor(_body: unknown, init?: { status?: number; webSocket?: unknown }) {
        this.status = init?.status ?? 200;
        this.webSocket = init?.webSocket;
      }
    };
    globalThis.fetch = (async () => {
      attemptCount++;
      const upstream = new MockSocket();
      const idx = attemptCount;
      upstream.onSend = (raw: string) => {
        const parsed = JSON.parse(raw);
        if (parsed.setup) {
          if (idx === 1) {
            // Simulate 1008 model not found on primary gemini-3.8-live
            queueMicrotask(() =>
              upstream.emit("close", {
                code: 1008,
                reason: "models/gemini-3.8-live is not found for API version v1beta",
              })
            );
          } else if (idx === 2) {
            // Simulate setupComplete on fallback model
            queueMicrotask(() => upstream.emit("message", { data: JSON.stringify({ setupComplete: {} }) }));
          }
        }
      };
      return { status: 101, webSocket: upstream } as unknown as Response;
    }) as typeof fetch;

    const res = await worker.fetch(
      new Request("https://smilemaster.example.com/ws/live?timezone=Asia/Kolkata", {
        headers: { Upgrade: "websocket" },
      }),
      { GEMINI_API_KEY: "AIzaFakeKey" },
      {
        waitUntil(p: Promise<unknown>) {
          waitPromises.push(p);
        },
      }
    );

    assert.equal(res.status, 101);
    await Promise.all(waitPromises);
    assert.equal(attemptCount, 2);
    const readyFrame = serverSocket.sent.map((s) => JSON.parse(s)).find((m) => m.type === "ready");
    assert.ok(readyFrame, "client must receive ready frame after fallback succeeds");
    assert.equal(readyFrame.model, FALLBACK_LIVE_MODEL);
  } finally {
    (globalThis as Record<string, unknown>).WebSocketPair = origWebSocketPair;
    globalThis.fetch = origFetch;
    globalThis.Response = origResponse;
  }
});
