import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function findFeaturedPublished(limit: number) {
  return prisma.blogPost.findMany({
    where: { isFeatured: true, publishedAt: { not: null } },
    orderBy: { sortOrder: "asc" },
    take: limit,
  });
}

export function listPublished(filter: { page: number; limit: number }) {
  return prisma.blogPost.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countPublished() {
  return prisma.blogPost.count({ where: { publishedAt: { not: null } } });
}

export function findPublishedBySlug(slug: string) {
  return prisma.blogPost.findFirst({ where: { slug, publishedAt: { not: null } } });
}

export function findAllForAdmin() {
  return prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
}

export function findById(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}

export function findBySlug(slug: string) {
  return prisma.blogPost.findUnique({ where: { slug } });
}

export function existsBySlug(slug: string) {
  return prisma.blogPost
    .findUnique({ where: { slug }, select: { id: true } })
    .then((row) => row !== null);
}

export interface BlogPostCreateFields {
  title: string;
  slug: string;
  category: string;
  coverImageUrl: string | null | undefined;
  excerpt: string;
  bodyMarkdown: string;
  readTimeMinutes: number;
  publishedAt: Date | null | undefined;
  isFeatured: boolean | undefined;
  sortOrder: number | undefined;
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
}

export function createPost(data: BlogPostCreateFields) {
  const fields = omitUndefined({
    coverImageUrl: data.coverImageUrl,
    publishedAt: data.publishedAt,
    isFeatured: data.isFeatured,
    sortOrder: data.sortOrder,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
  });
  return prisma.blogPost.create({
    data: {
      title: data.title,
      slug: data.slug,
      category: data.category,
      excerpt: data.excerpt,
      bodyMarkdown: data.bodyMarkdown,
      readTimeMinutes: data.readTimeMinutes,
      ...fields,
    },
  });
}

export interface BlogPostUpdateFields {
  title: string | undefined;
  slug: string | undefined;
  category: string | undefined;
  coverImageUrl: string | null | undefined;
  excerpt: string | undefined;
  bodyMarkdown: string | undefined;
  readTimeMinutes: number | undefined;
  publishedAt: Date | null | undefined;
  isFeatured: boolean | undefined;
  sortOrder: number | undefined;
  seoTitle: string | null | undefined;
  seoDescription: string | null | undefined;
}

export function updatePost(id: string, data: BlogPostUpdateFields) {
  return prisma.blogPost.update({ where: { id }, data: omitUndefined(data) });
}

export function deletePost(id: string) {
  return prisma.blogPost.delete({ where: { id } });
}
