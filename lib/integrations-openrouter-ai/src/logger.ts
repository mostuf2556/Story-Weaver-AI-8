import pino from "pino";
import path from "path";
import fs from "fs";
import { staticLogConfig } from "./log-config";

const isProduction = process.env.NODE_ENV === "production";
const cfg = staticLogConfig.logs.openrouter;
const logLevel = cfg.level || staticLogConfig.level;

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

export const openrouterLogger =
  targets.length > 0
    ? pino({ name: "openrouter", level: logLevel, transport: { targets } })
    : pino({ name: "openrouter", level: "silent" });

