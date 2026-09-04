import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listBlogPosts } from "@/lib/api/catalog";

export const metadata: Metadata = {
  title: "Wedding Planning Blog & Guides",
  description:
    "Expert wedding planning tips, styling advice, vendor guides, and real inspiration to help you plan your perfect day.",
  alternates: { canonical: "/blog" },
};

interface BlogListPageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 12;

export default async function BlogListPage({ searchParams }: BlogListPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const { data: posts, meta } = await listBlogPosts({ page, limit: PAGE_SIZE });
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-surface-page">
      <PublicTopbar />

      <div className="px-6 py-10 max-[900px]:px-4">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-jet-black">Wedding Planning Blog &amp; Guides</h1>
          <p className="mt-2 text-sm text-text-grey">
            Expert tips, styling advice, and practical planning guides to help you plan your perfect wedding.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
            <h3 className="mb-1.5 text-[15px] font-bold">No articles published yet</h3>
            <p className="max-w-[320px] text-[13px] text-text-grey">Check back soon for wedding planning advice.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm no-underline text-inherit transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-surface-input">
                    {post.coverImageUrl && (
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    )}
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-jet-black backdrop-blur-xs">
                      {post.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-text-grey mb-1.5">
                        <span>{post.readTimeMinutes} min read</span>
                      </div>
                      <h2 className="text-sm font-bold text-jet-black group-hover:text-brand-primary transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h2>
                      <p className="mt-1.5 text-xs text-text-grey line-clamp-2">{post.excerpt}</p>
                    </div>
                    <span className="mt-3 text-xs font-bold text-brand-primary">Read Article →</span>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}`}
                    className="rounded-md border border-border bg-white px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input"
                  >
                    ← Previous
                  </Link>
                )}
                <span className="text-xs text-text-grey">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/blog?page=${page + 1}`}
                    className="rounded-md border border-border bg-white px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
