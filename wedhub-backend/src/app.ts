import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { env } from "./config/env";
import { checkDatabaseConnection } from "./config/database";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware";
import { notFoundMiddleware } from "./common/middleware/not-found.middleware";
import { errorMiddleware } from "./common/middleware/error.middleware";
import { successResponse } from "./common/utils/api-response.util";
import { apiV1Router } from "./routes";
import "./modules/webhooks/webhook.types";

// Arch Phase 19 Stage A — the only two real, first-party browser origins
// this API is ever meant to be called from cross-origin: the public
// couple/vendor Next.js app (FRONTEND_URL) and the separate admin Next.js
// app (ADMIN_URL). Deliberately NOT a wildcard/`origin: true` — CORS only
// gates browser-initiated requests, so server-to-server callers (Razorpay
// webhooks, Telegram webhooks, the frontend's own Route Handlers proxying
// requests) are entirely unaffected by this and need no exemption.
const allowedOrigins = [env.FRONTEND_URL, env.ADMIN_URL];

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  // Arch Phase 19 Stage A — sensible defaults only. This server is
  // API-only (every route is under /api/v1, plus a bare JSON /health) and
  // never renders HTML to a browser, so helmet's default CSP has no real
  // XSS-mitigation value here — it's cheap defense-in-depth on this
  // server's own JSON/error responses, not a hand-tuned policy. The
  // security-relevant CSP lives in wedhub-frontend-app/next.config.ts,
  // which actually serves HTML.
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  // This process is only ever reached via Nginx (public API domain) or the
  // Next.js frontend's server-to-server fetches — both always originate
  // from loopback on this same host (see HOST in config/env.ts). "loopback"
  // tells Express to trust X-Forwarded-For only when the direct connection
  // is from 127.0.0.1/::1, so req.ip resolves to the real visitor IP
  // instead of every request collapsing to the same loopback address —
  // which otherwise makes every IP-keyed rate limiter (rate-limit.middleware.ts)
  // share one budget across all visitors.
  app.set("trust proxy", "loopback");
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
