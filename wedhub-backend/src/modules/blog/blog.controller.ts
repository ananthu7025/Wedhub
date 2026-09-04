import type { Request, Response } from "express";
import { successResponse, paginatedResponse } from "../../common/utils/api-response.util";
import * as blogService from "./blog.service";
import type { CreateBlogPostBody, ListBlogPostsQuery, UpdateBlogPostBody } from "./blog.schema";

export async function listFeatured(_req: Request, res: Response): Promise<void> {
  const posts = await blogService.listFeaturedForHomepage();
  res.json(successResponse(posts));
}

export async function listPublished(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListBlogPostsQuery;
  const { posts, total } = await blogService.listPublished({ page: query.page, limit: query.limit });
  res.json(
    paginatedResponse(posts, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function getBySlug(req: Request, res: Response): Promise<void> {
  const post = await blogService.getPublishedBySlug(req.params.slug as string);
  res.json(successResponse(post));
}

export async function listAll(_req: Request, res: Response): Promise<void> {
  const posts = await blogService.listAllForAdmin();
  res.json(successResponse(posts));
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateBlogPostBody;
  const post = await blogService.createPost(body);
  res.status(201).json(successResponse(post));
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateBlogPostBody;
  const post = await blogService.updatePost(req.params.id as string, body);
  res.json(successResponse(post));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await blogService.deletePost(req.params.id as string);
  res.json(successResponse({ deleted: true }));
}
