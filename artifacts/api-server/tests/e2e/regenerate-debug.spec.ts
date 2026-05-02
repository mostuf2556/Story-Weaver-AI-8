/**
 * E2E tests: Regenerate endpoint — debug request/response fields
 *
 * The API always embeds the full OpenRouter request payload and completion in
 * every regenerate (and ai-turn) response body. The story page debug panel
 * reads these same fields: when config.json has `"debugToggle": true` the 🐛
 * button is shown so operators can inspect them in real-time without touching
 * server logs.
 *
 * How the data flows:
 *
 *   Browser  ──POST /api/openrouter/messages/:id/regenerate──►  API server
 *   API server  ──chat.completions.create──►  OpenRouter
 *   OpenRouter  ──ChatCompletion──►  API server
 *   API server  ──{ request, response, requestedModel, actualModel }──►  Browser
 *   DebugPanel  reads `openrouterRequest` / `openrouterResponse` from the same body
 *
 * Test setup (requires OpenRouter API key):
 *   1. Create a throwaway conversation.
 *   2. Add a user message with skipAiCompletion so the SSE stream is not opened.
 *   3. Trigger a non-streaming AI turn to produce an assistant message.
 *   4. Call regenerate on that assistant message and inspect the debug fields.
 */

import { test, expect } from "@playwright/test";

const API = "/api";

function hasApiKey(): boolean {
  return !!(
    process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY
  );
}

// ── Config endpoint ────────────────────────────────────────────────────────────
// This test runs with or without an API key.

test.describe("GET /api/openrouter/config", () => {
  test("debugToggle is true — enables the debug panel button in the UI", async ({
    request,
  }) => {
    const res = await request.get(`${API}/openrouter/config`);
    expect(res.ok()).toBeTruthy();

    const cfg = await res.json();

    // When debugToggle is true the 🐛 icon button is rendered in story.tsx.
    // Clicking it opens the DebugPanel which shows every request/response pair
    // captured since the page loaded — including regenerate calls.
    expect(cfg).toHaveProperty("debugToggle", true);

    // Other config fields the debug panel header reads
    expect(cfg).toHaveProperty("model");
    expect(typeof cfg.model).toBe("string");

    expect(cfg).toHaveProperty("childSafe");
    expect(typeof cfg.childSafe).toBe("boolean");
  });
});

// ── Full regenerate debug flow ─────────────────────────────────────────────────
// Requires a real OpenRouter API key. Skipped automatically in CI when the key
// is absent.

test.describe("POST /api/openrouter/messages/:id/regenerate — debug fields", () => {
  let convId: number;
  let assistantMsgId: number;

  // Seed: conversation + user message + one AI turn
  test.beforeAll(async ({ request }) => {
    if (!hasApiKey()) return; // individual tests skip themselves; setup is a no-op

    // Step 1 — create a throwaway conversation
    const convRes = await request.post(`${API}/openrouter/conversations`, {
      data: { title: "e2e-regenerate-debug" },
    });
    expect(convRes.ok()).toBeTruthy();
    const conv = await convRes.json();
    convId = conv.id;

    // Step 2 — add a user message without opening the SSE stream
    const msgRes = await request.post(
      `${API}/openrouter/conversations/${convId}/messages`,
      {
        data: {
          content: "Once upon a time there was a brave little star.",
          skipAiCompletion: true,
        },
      },
    );
    expect(msgRes.ok()).toBeTruthy();

    // Step 3 — trigger a non-streaming AI turn to get an assistant message
    const aiRes = await request.post(
      `${API}/openrouter/conversations/${convId}/ai-turn`,
      {
        data: { maxTokens: 40 },
        timeout: 30_000,
      },
    );
    expect(aiRes.status()).toBe(200);
    const aiBody = await aiRes.json();

    // ai-turn also returns request / response / requestedModel / actualModel —
    // the same shape as regenerate, so the debug panel shows it identically
    expect(aiBody).toHaveProperty("request");
    expect(aiBody).toHaveProperty("response");
    expect(aiBody).toHaveProperty("message");

    assistantMsgId = aiBody.message.id;
  });

  test.afterAll(async ({ request }) => {
    if (convId) {
      await request.delete(`${API}/openrouter/conversations/${convId}`);
    }
  });

  // ── All debug fields in one call ─────────────────────────────────────────────
  //
  // request / response / requestedModel / actualModel are checked together from
  // a single regenerate call. Using one call instead of three prevents failures
  // caused by the free-tier model returning empty on one of the extra round-trips.
  // maxRetries: 5 gives extra headroom against free-tier flakiness.

  test("request, response, and model-routing fields are present in a single call", async ({
    request,
  }) => {
    test.skip(!hasApiKey(), "No OpenRouter API key — skipping live AI test");

    const res = await request.post(
      `${API}/openrouter/messages/${assistantMsgId}/regenerate`,
      {
        data: { maxTokens: 40, maxRetries: 5 },
        timeout: 60_000,
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    // ── request field ─────────────────────────────────────────────────────────
    // Debug panel label: "API → OpenRouter / OpenRouter request payload"
    expect(body).toHaveProperty("request");
    const req = body.request as {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };

    expect(typeof req.model).toBe("string");
    expect(req.model.length).toBeGreaterThan(0);
    expect(typeof req.max_tokens).toBe("number");
    expect(req.max_tokens).toBeGreaterThan(0);

    // messages[0] is always the system prompt — confirms "fit-here" rewrite
    // mode (not "continue") and childSafe guardrails are injected
    expect(Array.isArray(req.messages)).toBe(true);
    expect(req.messages.length).toBeGreaterThanOrEqual(1);
    const system = req.messages[0];
    expect(system.role).toBe("system");
    expect(system.content).toContain("fits naturally at this point");

    // Remaining entries are conversation history prior to the target paragraph
    for (const m of req.messages.slice(1)) {
      expect(["user", "assistant"]).toContain(m.role);
      expect(typeof m.content).toBe("string");
    }

    // ── response field ────────────────────────────────────────────────────────
    // Debug panel label: "API → OpenRouter / OpenRouter completion"
    expect(body).toHaveProperty("response");
    const completion = body.response as {
      id: string;
      object: string;
      model: string;
      choices: Array<{
        message: { role: string; content: string };
        finish_reason: string;
      }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    expect(typeof completion.id).toBe("string");
    expect(completion.object).toBe("chat.completion");
    expect(typeof completion.model).toBe("string");

    expect(Array.isArray(completion.choices)).toBe(true);
    expect(completion.choices.length).toBeGreaterThan(0);
    const choice = completion.choices[0];
    expect(choice.message.role).toBe("assistant");
    expect(typeof choice.message.content).toBe("string");
    expect(choice.message.content.length).toBeGreaterThan(0);

    expect(completion.usage.prompt_tokens).toBeGreaterThan(0);
    expect(completion.usage.completion_tokens).toBeGreaterThan(0);

    // ── model routing ─────────────────────────────────────────────────────────
    // Debug panel ModelBadge: "requested → actual (resolved)" when they differ
    expect(body).toHaveProperty("requestedModel");
    expect(typeof body.requestedModel).toBe("string");
    expect(body).toHaveProperty("actualModel");
    expect(typeof body.actualModel).toBe("string");
  });

  // ── maxRetries / attempts ─────────────────────────────────────────────────────

  test("maxRetries controls how many attempts are recorded in the attempts array", async ({
    request,
  }) => {
    test.skip(!hasApiKey(), "No OpenRouter API key — skipping live AI test");

    // Send maxRetries: 1 — the API will make at most one call to OpenRouter.
    // The attempts array in the response lets you see every round-trip and
    // whether it succeeded, returned empty, or threw an error.
    const res = await request.post(
      `${API}/openrouter/messages/${assistantMsgId}/regenerate`,
      {
        data: { maxTokens: 40, maxRetries: 1 },
        timeout: 30_000,
      },
    );
    // With maxRetries: 1 the call may succeed or fail (if the model returns
    // empty on the only attempt); either way the response is structured.
    const body = await res.json();

    if (res.status() === 200) {
      // Success path: attempts array has exactly one successful entry
      expect(body).toHaveProperty("attempts");
      expect(Array.isArray(body.attempts)).toBe(true);
      expect(body.attempts.length).toBeLessThanOrEqual(1);
      const [a] = body.attempts as Array<{
        attempt: number;
        durationMs: number;
        success: boolean;
        finishReason?: string | null;
      }>;
      expect(a.attempt).toBe(1);
      expect(a.success).toBe(true);
      expect(typeof a.durationMs).toBe("number");
    } else {
      // Failure path (empty response on the only attempt): error + attempts
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("attempts");
      expect(Array.isArray(body.attempts)).toBe(true);
      expect(body.attempts.length).toBe(1);
    }
  });

  test("attempts array — each entry has attempt number, duration, and success flag", async ({
    request,
  }) => {
    test.skip(!hasApiKey(), "No OpenRouter API key — skipping live AI test");

    const res = await request.post(
      `${API}/openrouter/messages/${assistantMsgId}/regenerate`,
      {
        data: { maxTokens: 40, maxRetries: 3 },
        timeout: 30_000,
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    // attempts mirrors the same structure as the ai-turn endpoint so the
    // debug panel can show per-round-trip timing for both operations.
    expect(body).toHaveProperty("attempts");
    const attempts = body.attempts as Array<{
      attempt: number;
      durationMs: number;
      success: boolean;
      finishReason?: string | null;
      empty?: boolean;
      error?: { message: string };
    }>;
    expect(Array.isArray(attempts)).toBe(true);
    expect(attempts.length).toBeGreaterThanOrEqual(1);

    for (const a of attempts) {
      expect(typeof a.attempt).toBe("number");
      expect(a.attempt).toBeGreaterThanOrEqual(1);
      expect(typeof a.durationMs).toBe("number");
      expect(a.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof a.success).toBe("boolean");
    }

    // The last entry must be the successful one
    const last = attempts[attempts.length - 1];
    expect(last.success).toBe(true);
  });

  // ── error path ────────────────────────────────────────────────────────────────
  // These tests need no API key — they never reach OpenRouter.

  test("404 when messageId does not exist", async ({ request }) => {
    const res = await request.post(
      `${API}/openrouter/messages/999999/regenerate`,
      { data: {} },
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("400 when messageId is not a number", async ({ request }) => {
    const res = await request.post(
      `${API}/openrouter/messages/not-a-number/regenerate`,
      { data: {} },
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("400 when maxRetries is outside the 1–10 range", async ({ request }) => {
    // The Zod schema enforces .min(1).max(10) — values outside this range
    // are rejected before the DB is even queried.
    const tooHigh = await request.post(
      `${API}/openrouter/messages/1/regenerate`,
      { data: { maxRetries: 99 } },
    );
    expect(tooHigh.status()).toBe(400);
    expect(await tooHigh.json()).toHaveProperty("error");

    const tooLow = await request.post(
      `${API}/openrouter/messages/1/regenerate`,
      { data: { maxRetries: 0 } },
    );
    expect(tooLow.status()).toBe(400);
    expect(await tooLow.json()).toHaveProperty("error");
  });
});
