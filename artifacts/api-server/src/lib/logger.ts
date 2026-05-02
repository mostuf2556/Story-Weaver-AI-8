import pino from "pino";
import path from "path";
import fs from "fs";
import { staticLogConfig } from "@workspace/integrations-openrouter-ai";

const isProduction = process.env.NODE_ENV === "production";
const cfg = staticLogConfig.logs.server;
const logLevel = cfg.level || staticLogConfig.level;

const redactPaths: string[] = [
  "req.headers.cookie",
  "res.headers['set-cookie']",
];

if (staticLogConfig.redactSecrets) {
  redactPaths.push("req.headers.authorization");
}

type PinoTransportTarget = {
  target: string;
  options: Record<string, unknown>;
  level: string;
};

const targets: PinoTransportTarget[] = [];

if (!isProduction && cfg.console) {
  targets.push({
    target: "pino-pretty",
    options: { colorize: true, destination: 1 },
    level: logLevel,
  });
}

if (cfg.enabled) {
  const logPath = path.resolve(process.cwd(), cfg.path);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  targets.push({
    target: "pino/file",
    options: { destination: logPath },
    level: logLevel,
  });
}

export const logger =
  targets.length > 0
    ? pino({ level: logLevel, redact: redactPaths, transport: { targets } })
    : pino({ level: "silent", redact: redactPaths });
