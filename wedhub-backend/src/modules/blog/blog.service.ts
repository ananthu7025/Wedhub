import { NotFoundError } from "../../common/errors";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import * as blogRepository from "./blog.repository";
import type { CreateBlogPostBody, UpdateBlogPostBody } from "./blog.schema";

// Top N featured+published posts shown in the homepage teaser section,
// matching PopularSearchCard's "small, curated" precedent — a homepage
// teaser section is not the full /blog list, it's a handful of highlights.
const FEATURED_HOMEPAGE_LIMIT = 6;

export function listFeaturedForHomepage() {
  return blogRepository.findFeaturedPublished(FEATURED_HOMEPAGE_LIMIT);
}

export async function listPublished(filter: { page: number; limit: number }) {
  const [posts, total] = await Promise.all([
    blogRepository.listPublished(filter),
    blogRepository.countPublished(),
  ]);
  return { posts, total };
}

export async function getPublishedBySlug(slug: string) {
  const post = await blogRepository.findPublishedBySlug(slug);
  if (!post) {
    throw new NotFoundError("Blog post not found");
  }
  return post;
}

export function listAllForAdmin() {
  return blogRepository.findAllForAdmin();
}

export async function createPost(input: CreateBlogPostBody) {
  const baseSlug = slugify(input.slug && input.slug.length > 0 ? input.slug : input.title);
  const slug = await generateUniqueSlug(baseSlug, blogRepository.existsBySlug);

  return blogRepository.createPost({
    title: input.title,
    slug,
    category: input.category,
    coverImageUrl: input.coverImageUrl,
    excerpt: input.excerpt,
    bodyMarkdown: input.bodyMarkdown,
    readTimeMinutes: input.readTimeMinutes,
    publishedAt: input.publishedAt,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  });
}

export async function updatePost(id: string, input: UpdateBlogPostBody) {
  const existing = await blogRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Blog post not found");
  }

  let slug: string | undefined;
  if (input.slug !== undefined) {
    const baseSlug = slugify(input.slug.length > 0 ? input.slug : input.title ?? existing.title);
    if (baseSlug !== existing.slug) {
      slug = await generateUniqueSlug(baseSlug, async (candidate) => {
        if (candidate === existing.slug) {
          return false;
        }
        return blogRepository.existsBySlug(candidate);
      });
    } else {
      slug = existing.slug;
    }
  }

  return blogRepository.updatePost(id, {
    title: input.title,
    slug,
    category: input.category,
    coverImageUrl: input.coverImageUrl,
    excerpt: input.excerpt,
    bodyMarkdown: input.bodyMarkdown,
    readTimeMinutes: input.readTimeMinutes,
    publishedAt: input.publishedAt,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  });
}

export async function deletePost(id: string): Promise<void> {
  const existing = await blogRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Blog post not found");
  }
  await blogRepository.deletePost(id);
}
