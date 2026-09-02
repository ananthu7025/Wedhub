import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { checkDatabaseConnection } from "./config/database";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";
import { notFoundMiddleware } from "./common/middleware/not-found.middleware";
import { errorMiddleware } from "./common/middleware/error.middleware";
import { successResponse } from "./common/utils/api-response.util";
import { apiV1Router } from "./routes";
import "./modules/webhooks/webhook.types";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  // Captures the exact raw request body onto req.rawBody before JSON parsing
  // consumes it — Razorpay's webhook signature (Coding Rule 6: all external
  // webhooks are verified) is computed over the raw bytes, not the
  // re-serialized parsed object, which can differ in key order/whitespace.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    }),
  );

  app.get("/health", (_req, res) => {
    void (async () => {
      const databaseConnected = await checkDatabaseConnection();
      const status = databaseConnected ? "healthy" : "degraded";
      res
        .status(databaseConnected ? 200 : 503)
        .json(successResponse({ status, database: databaseConnected ? "connected" : "unreachable" }));
    })();
  });

  app.use("/api/v1", apiV1Router);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
