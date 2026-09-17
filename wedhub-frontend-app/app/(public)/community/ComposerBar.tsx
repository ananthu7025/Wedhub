"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoIcon, PollIcon, QuestionIcon } from "./icons";

/**
 * Always-visible inline composer bar sitting above the feed (mockup:
 * text input + Photo/Poll/Ask a Question buttons + Post). Every action is
 * shown to every visitor regardless of auth state — clicking any of them
 * while logged out redirects to /login rather than hiding or disabling the
 * controls, per the confirmed requirement. Logged-in couples are routed to
 * the existing /community/new compose page (already has the full
 * title/body/poll-option/photo-upload form) with a query param pre-setting
 * the right mode, rather than duplicating that logic inline here.
 */
export function ComposerBar({ isAuthenticated, questionsTagId }: { isAuthenticated: boolean; questionsTagId: string | undefined }) {
  const router = useRouter();
  const [text, setText] = useState("");

  function goToCompose(params?: { mode?: "poll" | "photo"; tagId?: string }) {
    if (!isAuthenticated) {
      router.push("/login?next=/community/new");
      return;
    }
    const query = new URLSearchParams();
    if (params?.mode) query.set("mode", params.mode);
    if (params?.tagId) query.set("tag", params.tagId);
    const qs = query.toString();
    router.push(`/community/new${qs ? `?${qs}` : ""}`);
  }

  function handleInputFocus() {
    if (!isAuthenticated) {
      router.push("/login?next=/community/new");
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={handleInputFocus}
          placeholder="What's on your mind?"
          readOnly={!isAuthenticated}
          className="w-full rounded-full border border-border bg-surface-input px-4 py-2.5 text-sm placeholder:text-text-grey"
        />
        <button
          type="button"
          onClick={() => goToCompose()}
          className="flex-shrink-0 rounded-full bg-brand-primary px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
        >
          Post
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => goToCompose({ mode: "photo" })}
          className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-text-body hover:bg-surface-input"
        >
          <PhotoIcon className="h-3.5 w-3.5" /> Photo
        </button>
        <button
          type="button"
          onClick={() => goToCompose({ mode: "poll" })}
          className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-text-body hover:bg-surface-input"
        >
          <PollIcon className="h-3.5 w-3.5" /> Poll
        </button>
        <button
          type="button"
          onClick={() => goToCompose({ tagId: questionsTagId })}
          className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-text-body hover:bg-surface-input"
        >
          <QuestionIcon className="h-3.5 w-3.5" /> Ask a Question
        </button>
      </div>
    </div>
  );
}
