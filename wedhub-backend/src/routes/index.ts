import { Router } from "express";
import { successResponse } from "../common/utils/api-response.util";
import { authRouter } from "../modules/auth";
import { usersRouter } from "../modules/users";

export const apiV1Router = Router();

apiV1Router.get("/", (_req, res) => {
  res.json(successResponse({ name: "WedHub API", version: "v1" }));
});

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/users", usersRouter);

// Further module routers mount here as each is implemented, e.g.:
// apiV1Router.use("/vendors", vendorsRouter);
