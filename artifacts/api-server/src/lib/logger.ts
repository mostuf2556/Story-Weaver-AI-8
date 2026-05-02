import pino from "pino";
import path from "path";
import fs from "fs";
import { staticLogConfig } from "@workspace/integrations-openrouter-ai";

const logLevel = staticLogConfig.level;
const isProduction = process.env.NODE_ENV === "production";

const logsDir = path.resolve(process.cwd(), "logs");
fs.mkdirSync(logsDir, { recursive: true });
const serverLogPath = path.join(logsDir, "server.log");

const redactPaths: string[] = [
  "req.headers.cookie",
  "res.headers['set-cookie']",
];

if (staticLogConfig.redactSecrets) {
  redactPaths.push("req.headers.authorization");
}

const devTransport = {
  targets: [
    {
      target: "pino-pretty",
      options: { colorize: true, destination: 1 },
      level: logLevel,
    },
    {
      target: "pino/file",
      options: { destination: serverLogPath },
      level: logLevel,
    },
  ],
};

export const logger = pino({
  level: logLevel,
  redact: redactPaths,
  ...(isProduction ? {} : { transport: devTransport }),
});
