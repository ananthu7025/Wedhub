import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import { Role } from "../../common/enums/roles.enum";
import { setRefreshCookie } from "../auth/auth.controller";
import * as challengeService from "./challenge.service";
import * as challengeEntryService from "./challenge-entry.service";
import * as challengeRankingService from "./challenge-ranking.service";
import * as challengeVoteRepository from "./challenge-vote.repository";
import type {
  ActiveChallengeQuery,
  CreateChallengeBody,
  ListChallengesQuery,
  ListEntriesQuery,
  ParticipantsQuery,
  PromoteToGalleryBody,
  RankingsQuery,
  SetWinnerBody,
  UpdateChallengeBody,
} from "./challenge.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

// Batches "has this caller voted on these entries" into one query per page
// (challenge-vote.repository.ts's findMyVoteEntryIds) rather than N — backs
// the entry card's "Voted ✓" state without a second round trip per entry.
async function myVotedEntryIds(req: Request, entryIds: string[]): Promise<string[]> {
  if (!req.user || entryIds.length === 0) {
    return [];
  }
  const votes = await challengeVoteRepository.findMyVoteEntryIds(req.user.id, entryIds);
  return votes.map((v) => v.entryId);
}

export async function listChallenges(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListChallengesQuery;
  const items = await challengeService.listChallenges(query);
  res.json(successResponse(items));
}

export async function getActiveChallenge(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ActiveChallengeQuery;
  const challenge = await challengeService.getActive(query);
  res.json(successResponse(challenge));
}

export async function getChallengeBySlug(req: Request, res: Response): Promise<void> {
  const challenge = await challengeService.getBySlug(req.params.slug as string);
  res.json(successResponse(challenge));
}

export async function listEntries(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListEntriesQuery;
  const { items, total } = await challengeEntryService.listApprovedEntries(req.params.slug as string, query);
  const votedEntryIds = await myVotedEntryIds(req, items.map((item) => item.id));
  res.json(
    successResponse(items, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      myVotedEntryIds: votedEntryIds,
    }),
  );
}

export async function getEntry(req: Request, res: Response): Promise<void> {
  const { entry } = await challengeEntryService.getApprovedEntry(req.params.slug as string, req.params.entryId as string);
  const votedEntryIds = await myVotedEntryIds(req, [entry.id]);
  res.json(successResponse(entry, { hasVotedByMe: votedEntryIds.includes(entry.id) }));
}

export async function getMyEntry(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const entry = await challengeEntryService.getMyEntry(req.params.slug as string, userId);
  res.json(successResponse(entry));
}

export async function getRankings(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as RankingsQuery;
  const challenge = await challengeService.getBySlug(req.params.slug as string);
  const callerIsAdmin = req.user?.role === Role.ADMIN;
  const result = await challengeRankingService.getRankings(challenge, query, callerIsAdmin);
  const votedEntryIds = await myVotedEntryIds(req, result.entries.map((entry) => entry.id));
  res.json(
    successResponse(result.entries, {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
      frozen: result.frozen,
      myVotedEntryIds: votedEntryIds,
    }),
  );
}

export async function submitEntry(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const context = { ipAddress: req.ip, userAgent: req.header("user-agent") };
  const result = await challengeEntryService.submitEntry(req.params.slug as string, userId, req.body, context);

  // A no-vendor caller bootstrapped into a vendor mid-request (see
  // challenge-entry.vendor-bootstrap.ts) may have had their User.role
  // flipped END_USER -> VENDOR, which the JWT they authenticated this very
  // request with doesn't reflect yet — mint a fresh refresh cookie + hand
  // back a fresh access token, same shape as auth.controller.ts's
  // login/refresh handlers, so the frontend's Route Handler can swap both in.
  let accessToken: string | undefined;
  if (result.refreshedTokens) {
    setRefreshCookie(res, result.refreshedTokens);
    accessToken = result.refreshedTokens.accessToken;
  }

  res.status(201).json(successResponse({ entry: result.entry, accessToken }));
}

// Admin
export async function listAdminChallenges(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListChallengesQuery;
  const items = await challengeService.listChallenges(query);
  res.json(successResponse(items));
}

export async function getAdminChallenge(req: Request, res: Response): Promise<void> {
  const challenge = await challengeService.getById(req.params.id as string);
  res.json(successResponse(challenge));
}

export async function createChallenge(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateChallengeBody;
  const challenge = await challengeService.createChallenge(body);
  res.status(201).json(successResponse(challenge));
}

export async function updateChallenge(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateChallengeBody;
  const challenge = await challengeService.updateChallenge(req.params.id as string, body);
  res.json(successResponse(challenge));
}

export async function setWinner(req: Request, res: Response): Promise<void> {
  const adminId = requireUserId(req);
  const body = req.body as SetWinnerBody;
  const challenge = await challengeService.setWinner(req.params.id as string, body.entryId, adminId);
  res.json(successResponse(challenge));
}

export async function promoteToGallery(req: Request, res: Response): Promise<void> {
  const adminId = requireUserId(req);
  const body = req.body as PromoteToGalleryBody;
  const result = await challengeService.promoteToGallery(req.params.id as string, body.entryIds, body.galleryCategoryId, adminId);
  res.json(successResponse(result));
}

export async function listParticipants(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ParticipantsQuery;
  const participants = await challengeEntryService.listParticipants(req.params.id as string);

  if (query.format === "csv") {
    const csv = challengeEntryService.toParticipantsCsv(participants);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="participants-${req.params.id}.csv"`);
    res.send(csv);
    return;
  }

  res.json(successResponse(participants));
}
