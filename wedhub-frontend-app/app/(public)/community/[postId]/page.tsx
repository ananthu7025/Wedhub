import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getOptionalSession } from "@/lib/auth/dal";
import { getCommunityPost, listCommunityComments } from "@/lib/api/community";
import { ApiRequestError } from "@/lib/api/types";
import { PostDetail } from "./PostDetail";

interface CommunityPostPageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: CommunityPostPageProps): Promise<Metadata> {
  const { postId } = await params;
  try {
    const { data: post } = await getCommunityPost(postId);
    return { title: post.title };
  } catch {
    return { title: "Community" };
  }
}

export default async function CommunityPostPage({ params }: CommunityPostPageProps) {
  const { postId } = await params;

  let post;
  try {
    const result = await getCommunityPost(postId);
    post = result.data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const [{ data: comments }, session] = await Promise.all([listCommunityComments(postId), getOptionalSession()]);

  return (
    <>
      <PublicTopbar activeHref="/community" />
      <div className="mx-auto max-w-[720px] px-10 py-7 max-[900px]:px-4">
        <Link href="/community" className="mb-3 inline-block text-[13px] font-semibold text-text-grey no-underline">
          ← Back to community
        </Link>
        <PostDetail post={post} initialComments={comments} isAuthenticated={session !== null} />
      </div>
      <PublicFooter />
    </>
  );
}
