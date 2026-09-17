import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicTopbar, CoupleBottomNav } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getOptionalSession } from "@/lib/auth/dal";
import { listCommunityTags } from "@/lib/api/community";
import { NewPostForm } from "./NewPostForm";

export const metadata: Metadata = {
  title: "New Post",
};

export default async function NewCommunityPostPage() {
  const session = await getOptionalSession();
  if (session === null) {
    redirect("/login?next=/community/new");
  }

  const { data: tags } = await listCommunityTags();

  return (
    <>
      <PublicTopbar activeHref="/community" />
      <div className="mx-auto max-w-[560px] px-6 py-8">
        <Link href="/community" className="mb-3 inline-block text-[13px] font-semibold text-text-grey no-underline">
          ← Back to community
        </Link>
        <h1 className="mb-1 text-2xl font-bold">New post</h1>
        <p className="mb-6 text-sm text-text-grey">Ask a question or share something with other couples</p>

        <div className="rounded-xl border border-border bg-white p-6">
          <NewPostForm tags={tags} />
        </div>
      </div>
      <PublicFooter />
      <CoupleBottomNav activeHref="/community" />
    </>
  );
}
