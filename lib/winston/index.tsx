import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(), // Colorized logs
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          const metaString = Object.keys(metadata).length
            ? `\n${JSON.stringify(metadata, null, 2)}`
            : "";
          return `${timestamp} ${level}: ${message}${metaString}`;
        })
      ),
    })
  );
}

export default logger;
