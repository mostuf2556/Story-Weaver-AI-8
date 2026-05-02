import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { parse as parseYaml } from "yaml";
import { readFileSync } from "fs";
import { resolve } from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { loadLogConfig } from "@workspace/integrations-openrouter-ai";

function loadOpenApiSpec(): Record<string, unknown> | null {
  const candidates = [
    resolve(process.cwd(), "../../lib/api-spec/openapi.yaml"),
    resolve(process.cwd(), "lib/api-spec/openapi.yaml"),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, "utf-8");
      return parseYaml(raw) as Record<string, unknown>;
    } catch {
      // try next
    }
  }
  logger.warn("OpenAPI spec not found; Swagger UI disabled");
  return null;
}

const app: Express = express();

const SECRET_KEYS = new Set([
  "apiKey",
  "api_key",
  "apiUrl",
  "api_url",
  "password",
  "token",
  "authorization",
]);

/**
 * Sanitize a request body before logging.
 * Behaviour is driven by log.config.json:
 *   - showFullPayload: true  → no truncation, secrets still redacted if redactSecrets is true
 *   - showFullPayload: false → strings, arrays and depth are clamped per config
 */
function sanitizeBody(body: unknown, depth = 0): unknown {
  const cfg = loadLogConfig();

  if (body == null) return body;
  if (!cfg.showFullPayload && depth > cfg.body.maxDepth) return body;

  if (Array.isArray(body)) {
    if (!cfg.showFullPayload && body.length > cfg.body.maxArrayLength) {
      return [
        ...body.slice(0, cfg.body.maxArrayLength).map((v) => sanitizeBody(v, depth + 1)),
        `…(+${body.length - cfg.body.maxArrayLength} more)`,
      ];
    }
    return body.map((v) => sanitizeBody(v, depth + 1));
  }

  if (typeof body === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (cfg.redactSecrets && SECRET_KEYS.has(k)) {
        out[k] = v ? "[redacted]" : v;
      } else {
        out[k] = sanitizeBody(v, depth + 1);
      }
    }
    return out;
  }

  if (!cfg.showFullPayload && typeof body === "string" && body.length > cfg.body.maxStringLength) {
    return body.slice(0, cfg.body.maxStringLength) + `…(+${body.length - cfg.body.maxStringLength} chars)`;
  }

  return body;
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        const raw =
          (req as unknown as { raw?: { body?: unknown } }).raw?.body ??
          (req as unknown as { body?: unknown }).body;
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
          ...(raw !== undefined && raw !== null
            ? { body: sanitizeBody(raw) }
            : {}),
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const openApiSpec = loadOpenApiSpec();
if (openApiSpec) {
  app.get("/api/docs/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use((req, res, next) => {
    if (req.method === "GET" && req.path === "/api/docs") {
      res.redirect(301, "/api/docs/");
      return;
    }
    next();
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "Story Together API",
      swaggerOptions: { url: "/api/docs/openapi.json" },
    }),
  );
}

export default app;
