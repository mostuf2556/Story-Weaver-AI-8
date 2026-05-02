import { readFileSync } from "fs";
import { join, resolve } from "path";

/**
 * Per-file log settings shared by server.log and openrouter.log.
 */
export interface LogFileConfig {
  /** Write to this log file. Set false to disable file output entirely. */
  enabled: boolean;
  /**
   * File path for log output.
   * Relative paths are resolved from the process working directory.
   */
  path: string;
  /**
   * Log level for this file. Overrides the top-level `level` when set.
   * One of: "trace" | "debug" | "info" | "warn" | "error" | "fatal"
   */
  level: string;
  /** Also print to stdout (pino-pretty in dev, JSON in prod). */
  console: boolean;
}

/**
 * Settings for the browser-side client.log captured by the Vite plugin.
 */
export interface ClientLogFileConfig {
  /** Capture browser console output to a log file. Set false to disable. */
  enabled: boolean;
  /**
   * File path for captured browser logs.
   * Relative paths are resolved from the story-app directory.
   */
  path: string;
}

/**
 * Central log configuration shape.
 *
 * Edit `log.config.json` at the workspace root to change behaviour.
 * Restart services after saving (body/message settings hot-reload without restart).
 */
export interface LogConfig {
  /**
   * Default Pino log level applied to all loggers unless overridden per-file.
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

  /** Per-file log settings for each of the three log files. */
  logs: {
    /** Express / Pino HTTP request logs → server.log */
    server: LogFileConfig;
    /** OpenRouter client request/response logs → openrouter.log */
    openrouter: LogFileConfig;
    /** Browser console output captured by the Vite plugin → client.log */
    client: ClientLogFileConfig;
  };

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
  logs: {
    server: {
      enabled: true,
      path: "logs/server.log",
      level: "debug",
      console: true,
    },
    openrouter: {
      enabled: true,
      path: "logs/openrouter.log",
      level: "debug",
      console: true,
    },
    client: {
      enabled: true,
      path: "logs/client.log",
    },
  },
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
        logs: {
          server: { ...DEFAULT_LOG_CONFIG.logs.server, ...(parsed.logs?.server ?? {}) },
          openrouter: { ...DEFAULT_LOG_CONFIG.logs.openrouter, ...(parsed.logs?.openrouter ?? {}) },
          client: { ...DEFAULT_LOG_CONFIG.logs.client, ...(parsed.logs?.client ?? {}) },
        },
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
 * configure logger instances (level, path, enabled) which cannot change at runtime.
 */
export const staticLogConfig: LogConfig = loadLogConfig();
