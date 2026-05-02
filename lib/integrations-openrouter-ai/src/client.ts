import OpenAI, { type ClientOptions } from "openai";
import { openrouterLogger } from "./logger";
import { loadLogConfig } from "./log-config";

if (!process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_OPENROUTER_BASE_URL must be set. Did you forget to provision the OpenRouter AI integration?",
  );
}

if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_OPENROUTER_API_KEY must be set. Did you forget to provision the OpenRouter AI integration?",
  );
}

const SECRET_HEADERS = new Set(["authorization", "x-api-key"]);

function headersToObject(headers: unknown, redactSecrets: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;

  const redact = (k: string, v: string) =>
    redactSecrets && SECRET_HEADERS.has(k.toLowerCase()) ? "[REDACTED]" : v;

  if (typeof (headers as Headers).forEach === "function" && !Array.isArray(headers)) {
    (headers as Headers).forEach((value: string, key: string) => {
      out[key] = redact(key, value);
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers as Array<[string, string]>) {
      out[key] = redact(key, value);
    }
  } else if (typeof headers === "object") {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      out[key] = redact(key, String(value));
    }
  }
  return out;
}

export const loggingFetch: typeof fetch = async (input, init) => {
  const cfg = loadLogConfig();

  const anyInput = input as unknown as { url?: string; headers?: unknown; method?: string };
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (anyInput.url ?? String(input));
  const method = init?.method ?? anyInput.method ?? "GET";
  const reqHeaders = headersToObject(init?.headers ?? anyInput.headers, cfg.redactSecrets);

  const reqLog: Record<string, unknown> = { method, url, headers: reqHeaders };

  if (cfg.showFullPayload && init?.body) {
    try {
      reqLog.body =
        typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    } catch {
      reqLog.body = init.body;
    }
  }

  const start = Date.now();
  openrouterLogger.info({ req: reqLog }, "openrouter request");

  const response = await fetch(input as Parameters<typeof fetch>[0], init);
  const durationMs = Date.now() - start;

  if (!response.ok) {
    const cloned = response.clone();
    let body: string | undefined;
    try {
      body = await cloned.text();
    } catch {
      body = "<unreadable body>";
    }
    openrouterLogger.error(
      {
        res: {
          statusCode: response.status,
          statusText: response.statusText,
          body,
        },
        req: { method, url, headers: reqHeaders },
        durationMs,
      },
      "openrouter response error",
    );
  } else {
    openrouterLogger.info(
      {
        res: { statusCode: response.status },
        req: { method, url },
        durationMs,
      },
      "openrouter response",
    );
  }

  return response;
};

export function createOpenRouterClient(opts: {
  baseURL?: string | null;
  apiKey?: string | null;
} = {}): OpenAI {
  const options: ClientOptions = {
    baseURL: opts.baseURL ?? process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
    apiKey: opts.apiKey ?? process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
    fetch: loggingFetch,
  };
  return new OpenAI(options);
}

export const openrouter = createOpenRouterClient();
