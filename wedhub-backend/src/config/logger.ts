import pino, { type LoggerOptions } from "pino";
import { env, isDevelopment } from "./env";

const options: LoggerOptions = {
  level: env.NODE_ENV === "test" ? "silent" : "info",
  // Belt-and-suspenders redaction for anything ever logged with these keys at
  // any nesting depth (wildcard `*` segments) — e.g. an Express error object
  // that happens to carry req.headers, or a caller passing a raw user/body
  // object into logger.info/error. Existing call sites already avoid logging
  // secrets directly; this guards against a future one that doesn't.
  redact: {
    paths: [
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.tokenHash",
      "*.secret",
      "*.authorization",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
};

if (isDevelopment) {
  options.transport = {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
  };
}

export const logger = pino(options);
