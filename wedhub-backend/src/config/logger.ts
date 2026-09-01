import pino, { type LoggerOptions } from "pino";
import { env, isDevelopment } from "./env";

const options: LoggerOptions = {
  level: env.NODE_ENV === "test" ? "silent" : "info",
};

if (isDevelopment) {
  options.transport = {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
  };
}

export const logger = pino(options);
