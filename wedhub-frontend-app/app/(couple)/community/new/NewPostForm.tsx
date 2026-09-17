"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createCommunityPost } from "@/lib/api/community-client";
import { uploadCommunityPostPhoto } from "@/lib/media/upload";
import { formatApiError } from "@/lib/utils/error";
import type { CommunityTag } from "@/lib/api/community.types";

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_POLL_OPTIONS = 6;
const MIN_POLL_OPTIONS = 2;

export function NewPostForm({ tags }: { tags: CommunityTag[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<"TEXT" | "POLL">("TEXT");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [tagId, setTagId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      setErrorMessage("Only JPEG, PNG and WebP images are allowed.");
      setStatus("error");
      return;
    }
    setPhoto(file);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addPollOption() {
    setPollOptions((prev) => (prev.length < MAX_POLL_OPTIONS ? [...prev, ""] : prev));
  }

  function removePollOption(index: number) {
    setPollOptions((prev) => (prev.length > MIN_POLL_OPTIONS ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage("Please add a title");
      setStatus("error");
      return;
    }

    const trimmedOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (postType === "POLL" && trimmedOptions.length < MIN_POLL_OPTIONS) {
      setErrorMessage(`Please add at least ${MIN_POLL_OPTIONS} poll options`);
      setStatus("error");
      return;
    }
    if (postType === "TEXT" && !body.trim()) {
      setErrorMessage("Please add a description");
      setStatus("error");
      return;
    }

    setErrorMessage("");

    let mediaId: string | undefined;
    if (photo) {
      setStatus("uploading");
      try {
        mediaId = await uploadCommunityPostPhoto(photo);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Photo upload failed");
        return;
      }
    }

    setStatus("submitting");
    const result = await createCommunityPost(
      postType === "POLL"
        ? { postType: "POLL", title: title.trim(), body: body.trim() || undefined, tagId: tagId || undefined, mediaId, options: trimmedOptions }
        : { postType: "TEXT", title: title.trim(), body: body.trim(), tagId: tagId || undefined, mediaId },
    );

    if (result.success) {
      router.push(`/community/${result.data.id}`);
      router.refresh();
    } else {
      setStatus("error");
      setErrorMessage(formatApiError(result.error));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 flex gap-2">
        {(["TEXT", "POLL"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setPostType(type)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${
              postType === type ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            {type === "TEXT" ? "Post" : "Poll"}
          </button>
        ))}
      </div>

      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Topic</span>
        <select
          value={tagId}
          onChange={(e) => setTagId(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
        >
          <option value="">No specific topic</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">{postType === "POLL" ? "Question" : "Title"}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder={postType === "POLL" ? "Ask couples a question…" : "What's on your mind?"}
          className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
        />
      </label>

      {postType === "POLL" ? (
        <div className="mb-4">
          <span className="mb-1.5 block text-[13px] font-bold">
            Options <span className="font-normal text-text-grey">(2-6)</span>
          </span>
          <div className="flex flex-col gap-2">
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={option}
                  onChange={(e) => updatePollOption(index, e.target.value)}
                  maxLength={100}
                  placeholder={`Option ${index + 1}`}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
                {pollOptions.length > MIN_POLL_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => removePollOption(index)}
                    aria-label="Remove option"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border text-text-grey hover:bg-surface-input"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {pollOptions.length < MAX_POLL_OPTIONS && (
            <button type="button" onClick={addPollOption} className="mt-2 text-xs font-bold text-text-grey hover:text-text-dark">
              + Add option
            </button>
          )}
        </div>
      ) : null}

      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">
          {postType === "POLL" ? "Add context" : "Description"} {postType === "POLL" && <span className="font-normal text-text-grey">(optional)</span>}
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={postType === "POLL" ? "Any extra details…" : "Share the details — other couples are here to help"}
          maxLength={5000}
          className="min-h-[100px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
        />
      </label>

      <div className="mb-1">
        <span className="mb-1.5 block text-[13px] font-bold">
          Add a photo <span className="font-normal text-text-grey">(optional)</span>
        </span>
        {photo ? (
          <div className="relative mb-2 h-20 w-20 overflow-hidden rounded-md bg-surface-input">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(photo)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label="Remove photo"
              className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[9px] text-white"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full cursor-pointer rounded-md border-[1.5px] border-dashed border-border px-6 py-6 text-center text-[13px] text-text-grey"
          >
            + Upload photo
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhotoSelect} />
      </div>

      {status === "error" && <p className="mt-3.5 text-[13px] text-red">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "uploading" || status === "submitting"}
        className="mt-5 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "uploading" ? "Uploading photo…" : status === "submitting" ? "Posting…" : postType === "POLL" ? "Post poll" : "Post"}
      </button>
    </form>
  );
}
