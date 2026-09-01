import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";
import { notFoundMiddleware } from "./common/middleware/not-found.middleware";
import { errorMiddleware } from "./common/middleware/error.middleware";
import { successResponse } from "./common/utils/api-response.util";
import { apiV1Router } from "./routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
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
    res.json(successResponse({ status: "healthy" }));
  });

  app.use("/api/v1", apiV1Router);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
