import { Router } from "express";
import { successResponse } from "../common/utils/api-response.util";

export const apiV1Router = Router();

apiV1Router.get("/", (_req, res) => {
  res.json(successResponse({ name: "WedHub API", version: "v1" }));
});

// Module routers mount here as each is implemented, e.g.:
// apiV1Router.use("/auth", authRouter);
// apiV1Router.use("/vendors", vendorsRouter);

// Module routers mount here as each is implemented, e.g.:
// apiV1Router.use("/auth", authRouter);
// apiV1Router.use("/vendors", vendorsRouter);
