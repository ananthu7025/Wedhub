import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getBlogPostBySlug } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

async function loadPost(slug: string) {
  try {
    const { data } = await getBlogPostBySlug(slug);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  const canonicalPath = `/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "article",
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await loadPost(slug);

  return (
    <div className="min-h-screen bg-surface-page">
      <PublicTopbar />

      <article className="px-6 py-10 max-[900px]:px-4">
        <nav className="mx-auto mb-4 max-w-3xl text-xs text-text-grey">
          <Link href="/" className="no-underline hover:underline">
            Home
          </Link>
          {" / "}
          <Link href="/blog" className="no-underline hover:underline">
            Blog
          </Link>
        </nav>

        <div className="mx-auto max-w-3xl">
          <span className="mb-3 inline-block rounded-md bg-white px-2.5 py-0.5 text-[11px] font-bold text-brand-primary border border-border">
            {post.category}
          </span>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-jet-black">{post.title}</h1>
          <div className="mb-6 flex items-center gap-2 text-xs text-text-grey">
            <span>{post.readTimeMinutes} min read</span>
          </div>

          {post.coverImageUrl && (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl bg-surface-input">
              <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" sizes="(max-width: 900px) 100vw, 768px" priority />
            </div>
          )}

          <div
            className="max-w-none text-sm leading-relaxed text-text-body
              [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-jet-black
              [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-jet-black
              [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-jet-black
              [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5
              [&_li]:mb-1.5 [&_a]:font-semibold [&_a]:text-brand-primary [&_a]:underline
              [&_strong]:font-bold [&_strong]:text-jet-black [&_blockquote]:border-l-4 [&_blockquote]:border-border
              [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-grey
              [&_img]:my-4 [&_img]:rounded-xl [&_code]:rounded [&_code]:bg-surface-input [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]"
          >
            <ReactMarkdown>{post.bodyMarkdown}</ReactMarkdown>
          </div>

          <div className="mt-10 border-t border-border pt-6">
            <Link href="/blog" className="text-xs font-bold text-brand-primary hover:underline">
              ← Back to all articles
            </Link>
          </div>
        </div>
      </article>

      <PublicFooter />
    </div>
  );
}
