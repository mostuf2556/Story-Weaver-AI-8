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

  // ── request field ────────────────────────────────────────────────────────────

  test("request field — contains the full payload forwarded to OpenRouter", async ({
    request,
  }) => {
    test.skip(!hasApiKey(), "No OpenRouter API key — skipping live AI test");

    const res = await request.post(
      `${API}/openrouter/messages/${assistantMsgId}/regenerate`,
      {
        data: { maxTokens: 40 },
        timeout: 30_000,
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    // The debug panel shows this under "API → OpenRouter / OpenRouter request payload"
    expect(body).toHaveProperty("request");
    const req = body.request as {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };

    // Model string (may be an alias like "openrouter/free" or a full model id)
    expect(typeof req.model).toBe("string");
    expect(req.model.length).toBeGreaterThan(0);

    // Token budget derived from maxTokens setting
    expect(typeof req.max_tokens).toBe("number");
    expect(req.max_tokens).toBeGreaterThan(0);

    // messages[0] is always the system prompt — confirms childSafe mode and
    // "fit-here" rewrite instruction are injected before the conversation history
    expect(Array.isArray(req.messages)).toBe(true);
    expect(req.messages.length).toBeGreaterThanOrEqual(1);

    const system = req.messages[0];
    expect(system.role).toBe("system");
    // "fit-here" mode prompt — tells the AI to rewrite in place, not append
    expect(system.content).toContain("fits naturally at this point");

    // History entries (prior messages only — the target paragraph is excluded)
    const history = req.messages.slice(1);
    for (const m of history) {
      expect(["user", "assistant"]).toContain(m.role);
      expect(typeof m.content).toBe("string");
    }
  });

  // ── response field ────────────────────────────────────────────────────────────

  test("response field — contains the raw ChatCompletion object from OpenRouter", async ({
    request,
  }) => {
    test.skip(!hasApiKey(), "No OpenRouter API key — skipping live AI test");

    const res = await request.post(
      `${API}/openrouter/messages/${assistantMsgId}/regenerate`,
      {
        data: { maxTokens: 40 },
        timeout: 30_000,
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    // The debug panel shows this under "API → OpenRouter / OpenRouter completion"
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

    // OpenAI-compatible ChatCompletion shape
    expect(typeof completion.id).toBe("string");
    expect(completion.object).toBe("chat.completion");
    expect(typeof completion.model).toBe("string");

    // The generated paragraph is in choices[0].message.content
    expect(Array.isArray(completion.choices)).toBe(true);
    expect(completion.choices.length).toBeGreaterThan(0);
    const choice = completion.choices[0];
    expect(choice.message.role).toBe("assistant");
    expect(typeof choice.message.content).toBe("string");
    expect(choice.message.content.length).toBeGreaterThan(0);

    // Token usage — visible in the completion object when inspected in the panel
    expect(completion.usage).toHaveProperty("prompt_tokens");
    expect(completion.usage).toHaveProperty("completion_tokens");
    expect(completion.usage.prompt_tokens).toBeGreaterThan(0);
    expect(completion.usage.completion_tokens).toBeGreaterThan(0);
  });

  // ── model routing fields ─────────────────────────────────────────────────────

  test("requestedModel / actualModel — shows alias→resolved routing in debug panel", async ({
    request,
  }) => {
    test.skip(!hasApiKey(), "No OpenRouter API key — skipping live AI test");

    const res = await request.post(
      `${API}/openrouter/messages/${assistantMsgId}/regenerate`,
      {
        data: { maxTokens: 40 },
        timeout: 30_000,
      },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    // requestedModel: what config.json / settings sent (may be "openrouter/free")
    // actualModel:    what OpenRouter resolved and returned in completion.model
    // The debug panel ModelBadge renders these as "requested → actual (resolved)"
    // when they differ, or "requested (exact match)" when they are the same.
    expect(body).toHaveProperty("requestedModel");
    expect(typeof body.requestedModel).toBe("string");

    expect(body).toHaveProperty("actualModel");
    expect(typeof body.actualModel).toBe("string");
  });

  // ── error path ────────────────────────────────────────────────────────────────
  // This test needs no API key — it never reaches OpenRouter.

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
});
