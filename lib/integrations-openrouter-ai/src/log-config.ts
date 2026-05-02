import { readFileSync } from "fs";
import { join, resolve } from "path";

/**
 * Central log configuration shape.
 *
 * Edit `log.config.json` at the workspace root to change behaviour.
 * Restart the API server after saving.
 */
export interface LogConfig {
  /**
   * Pino log level applied to all loggers.
   * One of: "trace" | "debug" | "info" | "warn" | "error" | "fatal"
   */
  level: string;

  /**
   * When true, all truncation is disabled:
   *   - HTTP request body strings and arrays are logged in full.
   *   - OpenRouter AI payloads are logged with every message and full content.
   *   - The outgoing fetch body to OpenRouter is included in request logs.
   */
  showFullPayload: boolean;

  /**
   * When true, known secret fields (apiKey, password, token, …) in request
   * bodies are replaced with "[redacted]" before logging.
   */
  redactSecrets: boolean;

  /** Controls HTTP request body sanitization. Ignored when showFullPayload is true. */
  body: {
    /** Max characters for string values before truncation. */
    maxStringLength: number;
    /** Max array elements before the tail is collapsed into "…(+N more)". */
    maxArrayLength: number;
    /** Max recursion depth for object traversal. */
    maxDepth: number;
  };

  /** Controls the AI message preview in openrouter request logs. Ignored when showFullPayload is true. */
  openrouterMessages: {
    /** Number of messages shown from the start of the conversation. */
    previewHead: number;
    /** Number of messages shown from the end of the conversation. */
    previewTail: number;
    /** Max characters per message content before truncation. */
    maxCharsPerMessage: number;
  };
}

export const DEFAULT_LOG_CONFIG: LogConfig = {
  level: "debug",
  showFullPayload: false,
  redactSecrets: true,
  body: {
    maxStringLength: 2000,
    maxArrayLength: 20,
    maxDepth: 4,
  },
  openrouterMessages: {
    previewHead: 2,
    previewTail: 2,
    maxCharsPerMessage: 240,
  },
};

/**
 * Candidate paths for log.config.json, tried in order.
 * Covers running from workspace root or from artifacts/api-server.
 */
const CONFIG_CANDIDATES = [
  join(process.cwd(), "log.config.json"),
  resolve(process.cwd(), "../../log.config.json"),
];

/**
 * Load log configuration from `log.config.json`.
 * Falls back to DEFAULT_LOG_CONFIG if the file is missing or invalid.
 * Called fresh on each request so body/message settings hot-reload
 * without a server restart.
 */
export function loadLogConfig(): LogConfig {
  for (const candidate of CONFIG_CANDIDATES) {
    try {
      const raw = readFileSync(candidate, "utf-8");
      const parsed = JSON.parse(raw) as Partial<LogConfig>;
      return {
        ...DEFAULT_LOG_CONFIG,
        ...parsed,
        body: { ...DEFAULT_LOG_CONFIG.body, ...(parsed.body ?? {}) },
        openrouterMessages: {
          ...DEFAULT_LOG_CONFIG.openrouterMessages,
          ...(parsed.openrouterMessages ?? {}),
        },
      };
    } catch {
      // try next candidate
    }
  }
  return DEFAULT_LOG_CONFIG;
}

/**
 * Load log config once at module initialisation — used for values that
 * configure logger instances (level, redact) which cannot change at runtime.
 */
export const staticLogConfig: LogConfig = loadLogConfig();
