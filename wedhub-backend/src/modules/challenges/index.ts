import { Router } from "express";
import { challengePublicRouter, challengeAdminRouter } from "./challenge.routes";
import { challengeEntryPublicRouter, challengeEntryAdminRouter } from "./challenge-entry.routes";
import { challengeVoteRouter } from "./challenge-vote.routes";
import { challengeEntryMediaRouter } from "./challenge-entry-media.routes";

// Entry submission (/:slug/entries) and voting (/:slug/entries/:entryId/votes)
// are both sub-paths of /:slug — composed into one router here (rather than
// mounted as three separate top-level routers all claiming "/challenges" in
// routes/index.ts) so route precedence stays explicit and colocated instead
// of depending on Express's registration-order behavior across independent
// mounts. More specific paths (active, :slug/entries, :slug/rankings,
// :slug/my-entry) are registered before the generic GET /:slug in
// challenge.routes.ts's own file, and entry/vote sub-routers are added here
// before challengePublicRouter's catch-all-ish GET /:slug so their more
// specific paths win.
export const challengeRouter = Router();
challengeRouter.use(challengeEntryPublicRouter);
challengeRouter.use(challengeVoteRouter);
challengeRouter.use(challengePublicRouter);

export { challengeAdminRouter, challengeEntryAdminRouter, challengeEntryMediaRouter };
