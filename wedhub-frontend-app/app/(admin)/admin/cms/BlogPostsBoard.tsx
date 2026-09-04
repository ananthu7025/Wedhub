"use client";

import { useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { createAdminBlogPost, deleteAdminBlogPost, updateAdminBlogPost } from "@/lib/api/admin-client";
import type { AdminBlogPost } from "@/lib/api/admin.types";
import { formatApiError } from "@/lib/utils/error";
import { BlogCoverImagePicker } from "./BlogCoverImagePicker";

interface FormValues {
  title: string;
  slug?: string;
  category: string;
  coverImageUrl: string | null;
  excerpt: string;
  bodyMarkdown: string;
  readTimeMinutes: number;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
}

/**
 * Admin board for BlogPost (Arch Phase 17, added 2026-09-04) — the last
 * remaining CMS & SEO Backend item. Same state-management/edit/delete/
 * create shape as PopularSearchCardsBoard.tsx, extended with a Markdown
 * body textarea (plus a Preview toggle rendering it through
 * react-markdown, so an admin isn't authoring fully blind) and a
 * Publish/Unpublish toggle. Publishing is just PATCH-setting publishedAt
 * (null <-> now) — there's no separate publish endpoint, matching how
 * isFeatured toggles work on this same board and on PopularSearchCard.
 */
export function BlogPostsBoard({ initialPosts }: { initialPosts: AdminBlogPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(values: FormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminBlogPost(values);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPosts((prev) => [result.data, ...prev]);
    setAdding(false);
  }

  async function handleUpdate(post: AdminBlogPost, values: FormValues) {
    setPendingId(post.id);
    setError(null);
    const result = await updateAdminBlogPost(post.id, values);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === post.id ? result.data : p)));
    setEditingId(null);
  }

  async function handleToggleFeatured(post: AdminBlogPost) {
    setPendingId(post.id);
    setError(null);
    const result = await updateAdminBlogPost(post.id, { isFeatured: !post.isFeatured });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === post.id ? result.data : p)));
  }

  async function handleTogglePublished(post: AdminBlogPost) {
    setPendingId(post.id);
    setError(null);
    const result = await updateAdminBlogPost(post.id, {
      publishedAt: post.publishedAt ? null : new Date().toISOString(),
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPosts((prev) => prev.map((p) => (p.id === post.id ? result.data : p)));
  }

  async function handleDelete(post: AdminBlogPost) {
    setPendingId(post.id);
    setError(null);
    const result = await deleteAdminBlogPost(post.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</div>}

      {posts.length === 0 && !adding && <p className="mb-3 text-sm text-text-grey">No blog posts yet.</p>}

      <div className="mb-3 flex flex-col gap-3">
        {posts.map((post) =>
          editingId === post.id ? (
            <PostForm
              key={post.id}
              initial={post}
              saving={pendingId === post.id}
              onCancel={() => setEditingId(null)}
              onSubmit={(values) => handleUpdate(post, values)}
            />
          ) : (
            <div key={post.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-surface-input">
                {post.coverImageUrl && (
                  <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" sizes="56px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {post.title}
                  {post.isFeatured && (
                    <span className="rounded-full bg-emerald-10 px-2 py-0.5 text-[10px] font-bold text-emerald-70">
                      Featured on homepage
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      post.publishedAt ? "bg-emerald-10 text-emerald-70" : "bg-surface-input text-text-grey"
                    }`}
                  >
                    {post.publishedAt ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="truncate text-xs text-text-grey">
                  {post.category} · {post.readTimeMinutes} min read · /blog/{post.slug}
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  disabled={pendingId === post.id}
                  onClick={() => handleTogglePublished(post)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
                    post.publishedAt
                      ? "border border-border bg-white text-text-dark hover:bg-surface-input"
                      : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                  }`}
                >
                  {post.publishedAt ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === post.id}
                  onClick={() => handleToggleFeatured(post)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
                    post.isFeatured
                      ? "border border-border bg-white text-text-dark hover:bg-surface-input"
                      : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                  }`}
                >
                  {post.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === post.id}
                  onClick={() => setEditingId(post.id)}
                  className="text-[11px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pendingId === post.id}
                  onClick={() => handleDelete(post)}
                  className="text-[11px] font-bold text-red hover:underline disabled:opacity-60"
                >
                  {pendingId === post.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <PostForm saving={pendingId === "new"} onCancel={() => setAdding(false)} onSubmit={handleCreate} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-bold text-brand-primary hover:underline"
        >
          + Add blog post
        </button>
      )}
    </div>
  );
}

function PostForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: AdminBlogPost;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initial?.coverImageUrl ?? null);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [bodyMarkdown, setBodyMarkdown] = useState(initial?.bodyMarkdown ?? "");
  const [readTimeMinutes, setReadTimeMinutes] = useState(String(initial?.readTimeMinutes ?? ""));
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    const readTime = Number.parseInt(readTimeMinutes, 10);
    if (!title.trim() || !category.trim() || !excerpt.trim() || !bodyMarkdown.trim() || !Number.isFinite(readTime) || readTime < 1) {
      setValidationError("Title, category, excerpt, body, and a valid read time are required");
      return;
    }

    onSubmit({
      title: title.trim(),
      slug: slug.trim() ? slug.trim() : undefined,
      category: category.trim(),
      coverImageUrl,
      excerpt: excerpt.trim(),
      bodyMarkdown,
      readTimeMinutes: readTime,
      isFeatured,
      seoTitle: seoTitle.trim() ? seoTitle.trim() : null,
      seoDescription: seoDescription.trim() ? seoDescription.trim() : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Cover image</span>
        <BlogCoverImagePicker currentImageUrl={coverImageUrl} onUploaded={setCoverImageUrl} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Top 12 Trending Bridal Lehenga Colors For 2026"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">
            Slug <span className="font-normal">(optional — auto-generated from title)</span>
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            maxLength={200}
            placeholder="top-12-trending-bridal-lehenga-colors"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={100}
            placeholder="Bridal Fashion"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Read time (minutes)</span>
          <input
            value={readTimeMinutes}
            onChange={(e) => setReadTimeMinutes(e.target.value)}
            type="number"
            min={1}
            placeholder="5"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Excerpt</span>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Short teaser shown on homepage/list cards"
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
        />
      </label>

      <div>
        <div className="mb-0.5 flex items-center justify-between">
          <span className="block text-[10px] font-semibold text-text-grey">Body (Markdown)</span>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="text-[10px] font-bold text-brand-primary hover:underline"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div
            className="max-h-64 max-w-none overflow-y-auto rounded-md border border-border bg-surface-input px-3 py-2 text-xs [overflow-wrap:anywhere]
              [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-bold
              [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4
              [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:font-semibold [&_a]:text-brand-primary [&_a]:underline"
          >
            <ReactMarkdown>{bodyMarkdown || "*Nothing to preview yet*"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={bodyMarkdown}
            onChange={(e) => setBodyMarkdown(e.target.value)}
            rows={10}
            placeholder="## Full article body in Markdown"
            className="w-full rounded-md border border-border px-2 py-1.5 font-mono text-xs"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">
            SEO title <span className="font-normal">(optional — falls back to title)</span>
          </span>
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            maxLength={200}
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">
            SEO description <span className="font-normal">(optional — falls back to excerpt)</span>
          </span>
          <input
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            maxLength={500}
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-text-grey">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        Featured on homepage
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save" : "Add post"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
