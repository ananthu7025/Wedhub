import { Router } from "express";
import { successResponse } from "../common/utils/api-response.util";
import { authRouter } from "../modules/auth";
import { usersRouter } from "../modules/users";
import { categoriesRouter } from "../modules/categories";
import { locationsRouter } from "../modules/locations";
import { vendorRouter } from "../modules/vendors";
import { vendorAdminRouter } from "../modules/vendor-admin";
import { vendorClaimRouter } from "../modules/vendor-claim";
import { mediaAdminRouter, mediaRouter } from "../modules/media";
import { albumPublicRouter, albumSelfRouter } from "../modules/albums";

export const apiV1Router = Router();

apiV1Router.get("/", (_req, res) => {
  res.json(successResponse({ name: "WedHub API", version: "v1" }));
});

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/users", usersRouter);
apiV1Router.use("/categories", categoriesRouter);
apiV1Router.use("/locations", locationsRouter);
apiV1Router.use("/media", mediaRouter);
apiV1Router.use("/admin/media", mediaAdminRouter);

// Mounted BEFORE /vendors: vendorRouter's public GET /:slug would otherwise
// greedily match /vendors/claim/:token, /vendors/me/albums, /vendors/:slug/albums
// style paths first.
apiV1Router.use("/vendors/claim", vendorClaimRouter);
apiV1Router.use("/vendors/me/albums", albumSelfRouter);
apiV1Router.use("/vendors/:slug/albums", albumPublicRouter);
apiV1Router.use("/vendors", vendorRouter);
apiV1Router.use("/admin/vendors", vendorAdminRouter);
