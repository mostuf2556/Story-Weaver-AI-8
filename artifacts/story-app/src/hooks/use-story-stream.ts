import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOpenrouterMessagesQueryKey } from "@workspace/api-client-react";
import { type StorySettings } from "@/hooks/use-settings";

export interface DebugEntry {
  id: number;
  at: string;
  endpoint: string;
  method: string;
  status: number | null;
  /** Body sent from browser → API */
  request: unknown;
  /** Headers sent from browser → API */
  requestHeaders?: Record<string, string>;
  /** Body received from API → browser */
  response: unknown;
  /** Headers received from API → browser */
  responseHeaders?: Record<string, string>;
  /** The full request payload forwarded to OpenRouter (from API response body) */
  openrouterRequest?: unknown;
  /** The raw completion object returned by OpenRouter (from API response body) */
  openrouterResponse?: unknown;
  /** Model ID that was sent in the request (may be a generic alias). */
  requestedModel?: string;
  /** Actual model ID resolved and used by the API (extracted from completion). */
  actualModel?: string;
  durationMs: number;
}

let debugIdCounter = 0;
let debugListeners: Array<(entry: DebugEntry) => void> = [];

export function subscribeDebug(fn: (entry: DebugEntry) => void): () => void {
  debugListeners.push(fn);
  return () => {
    debugListeners = debugListeners.filter((l) => l !== fn);
  };
}

export function emitDebug(entry: Omit<DebugEntry, "id" | "at">): void {
  const full: DebugEntry = {
    ...entry,
    id: ++debugIdCounter,
    at: new Date().toISOString(),
  };
  for (const fn of debugListeners) fn(full);
}

/** Flatten a Headers object into a plain key→value record. */
function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function buildOptionsBody(settings?: StorySettings): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (!settings) return body;
  body.model = settings.model || "openrouter/free";
  body.maxTokens = settings.maxTokens;
  body.temperature = settings.temperature;
  if (settings.apiKey) body.apiKey = settings.apiKey;
  if (settings.apiUrl) body.apiUrl = settings.apiUrl;
  if (settings.stt?.aiLanguage) body.language = settings.stt.aiLanguage;
  body.maxRetries = settings.aiMaxRetries ?? 3;
  return body;
}

export function useStoryStream(conversationId: number, settings?: StorySettings) {
  const [isTyping, setIsTyping] = useState(false);
  const [streamedContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getListOpenrouterMessagesQueryKey(conversationId),
    });
  }, [conversationId, queryClient]);

  const submitUserMessage = useCallback(
    async (content: string): Promise<boolean> => {
      setStreamError(null);
      const endpoint = `/api/openrouter/conversations/${conversationId}/messages`;
      const requestBody: Record<string, unknown> = {
        content,
        skipAiCompletion: true,
      };
      if (settings?.stt?.language) {
        requestBody.language = settings.stt.language;
      }
      const reqHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const start = performance.now();
      let status: number | null = null;
      let responseJson: unknown = null;
      let responseHeaders: Record<string, string> | undefined;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify(requestBody),
        });
        status = response.status;
        responseHeaders = headersToRecord(response.headers);
        responseJson = await response.json().catch(() => null);
        if (!response.ok) {
          const msg =
            (responseJson as { error?: string } | null)?.error ??
            `Server error ${response.status}: ${response.statusText}`;
          throw new Error(msg);
        }
        invalidate();
        return true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("Error submitting user message:", error);
        setStreamError(`[${status ?? "ERR"}] ${msg}`);
        return false;
      } finally {
        emitDebug({
          endpoint,
          method: "POST",
          status,
          request: requestBody,
          requestHeaders: reqHeaders,
          response: responseJson,
          responseHeaders,
          durationMs: Math.round(performance.now() - start),
        });
      }
    },
    [conversationId, settings, invalidate],
  );

  const requestAiTurn = useCallback(async (): Promise<boolean> => {
    setIsTyping(true);
    setStreamError(null);

    const endpoint = `/api/openrouter/conversations/${conversationId}/ai-turn`;
    const requestBody = buildOptionsBody(settings);
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const start = performance.now();
    let status: number | null = null;
    let responseJson: unknown = null;
    let responseHeaders: Record<string, string> | undefined;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(requestBody),
      });
      status = response.status;
      responseHeaders = headersToRecord(response.headers);
      responseJson = await response.json().catch(() => null);

      if (!response.ok) {
        const msg =
          (responseJson as { error?: string } | null)?.error ??
          `Server error ${response.status}: ${response.statusText}`;
        throw new Error(msg);
      }
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error requesting AI turn:", error);
      setStreamError(`[${status ?? "ERR"}] ${msg}`);
      return false;
    } finally {
      setIsTyping(false);
      invalidate();
      const res = responseJson as {
        requestedModel?: string;
        actualModel?: string;
        message?: { model?: string };
        request?: unknown;
        response?: unknown;
      } | null;
      emitDebug({
        endpoint,
        method: "POST",
        status,
        request: requestBody,
        requestHeaders: reqHeaders,
        response: responseJson,
        responseHeaders,
        openrouterRequest: res?.request,
        openrouterResponse: res?.response,
        requestedModel:
          res?.requestedModel ??
          (requestBody as { model?: string }).model ??
          undefined,
        actualModel:
          res?.actualModel ?? res?.message?.model ?? undefined,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }, [conversationId, settings, invalidate]);

  const sendMessage = useCallback(
    async (content: string, options: { autoAiTurn?: boolean } = {}): Promise<void> => {
      const ok = await submitUserMessage(content);
      if (!ok) return;
      if (options.autoAiTurn) {
        await requestAiTurn();
      }
    },
    [submitUserMessage, requestAiTurn],
  );

  const clearError = useCallback(() => setStreamError(null), []);

  return {
    submitUserMessage,
    requestAiTurn,
    sendMessage,
    isTyping,
    streamedContent,
    streamError,
    clearError,
  };
}
