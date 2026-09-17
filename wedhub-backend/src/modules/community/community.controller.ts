import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as communityPostService from "./community-post.service";
import * as communityCommentService from "./community-comment.service";
import * as communityVoteService from "./community-vote.service";
import * as communityPollService from "./community-poll.service";
import * as communityTagRepository from "./community-tag.repository";
import type {
  CastPollVoteBody,
  CreateCommentBody,
  CreatePostBody,
  ListFeedQuery,
  ListFlaggedAdminQuery,
  ModeratePostBody,
  ReportPostBody,
} from "./community.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function listTags(_req: Request, res: Response): Promise<void> {
  const tags = await communityTagRepository.listTags();
  res.json(successResponse(tags));
}

export async function listFeed(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListFeedQuery;
  const { posts, total } = await communityPostService.listFeed({
    tagId: query.tagId,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
    viewerUserId: req.user?.id,
  });
  res.json(
    paginatedResponse(posts, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function getPost(req: Request, res: Response): Promise<void> {
  const post = await communityPostService.getPost(req.params.id as string, req.user?.id);
  res.json(successResponse(post));
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreatePostBody;
  const post = await communityPostService.createPost(userId, {
    tagId: body.tagId,
    title: body.title,
    body: body.body,
    mediaId: body.mediaId,
    pollOptions: body.postType === "POLL" ? body.options : undefined,
  });
  res.status(201).json(successResponse(post));
}

export async function reportPost(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as ReportPostBody;
  const report = await communityPostService.reportPost(userId, req.params.id as string, body.reason);
  res.status(201).json(successResponse(report));
}

export async function toggleVote(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await communityVoteService.toggleVote(req.params.id as string, userId);
  res.json(successResponse(result));
}

export async function castPollVote(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CastPollVoteBody;
  const result = await communityPollService.castPollVote(req.params.id as string, body.optionId, userId);
  res.json(successResponse(result));
}

export async function listComments(req: Request, res: Response): Promise<void> {
  const comments = await communityCommentService.listComments(req.params.id as string);
  res.json(successResponse(comments));
}

export async function createComment(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateCommentBody;
  const comment = await communityCommentService.createComment(userId, req.params.id as string, {
    parentId: body.parentId,
    body: body.body,
  });
  res.status(201).json(successResponse(comment));
}

export async function listFlaggedAdmin(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListFlaggedAdminQuery;
  const [posts, total] = await communityPostService.listFlaggedAdmin(query.page, query.limit);
  res.json(
    paginatedResponse(posts, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function moderatePost(req: Request, res: Response): Promise<void> {
  const body = req.body as ModeratePostBody;
  const post = await communityPostService.moderatePost(req.params.id as string, body.status);
  res.json(successResponse(post));
}
