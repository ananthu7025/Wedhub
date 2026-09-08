import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as challengeVoteService from "./challenge-vote.service";

export async function castVote(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError();
  }

  const result = await challengeVoteService.castVote({
    challengeSlug: req.params.slug as string,
    entryId: req.params.entryId as string,
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.header("user-agent"),
  });

  res.status(201).json(successResponse(result));
}
