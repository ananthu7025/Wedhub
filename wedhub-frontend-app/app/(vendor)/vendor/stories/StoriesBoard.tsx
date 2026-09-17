"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMyAlbum,
  deleteMyAlbum,
  respondToStoryCollaboration,
  submitMyWeddingStory,
  updateMedia,
  updateMyAlbum,
} from "@/lib/api/vendor-self-client";
import { searchVendorsClient } from "@/lib/api/catalog-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";
import type { MediaItem, VendorAlbumSelf, WeddingStorySelf } from "@/lib/api/vendor-self.types";

/**
 * Items 10/11 — vendor-facing "Real Stories" page, three sections:
 *
 * 1. Albums — the prerequisite for submitting a story (no album-management
 *    UI existed anywhere before this; PortfolioManager.tsx only manages
 *    loose Media, never Album groupings). A vendor creates a named album,
 *    assigns existing READY portfolio photos into it (via the same
 *    updateMedia({ albumId }) call PortfolioManager.tsx's "Set as logo"-
 *    style actions already use), and sets a cover.
 * 2. Submit a story — pick one of their own PUBLIC albums with a cover,
 *    write the narrative fields, optionally tag other vendors as
 *    collaborators (searched by business name via the public search
 *    endpoint). Lands PENDING until an admin reviews it.
 * 3. My stories / Awaiting my confirmation — status of what they've
 *    submitted, and any story someone else tagged them on that they need
 *    to confirm or decline before it's credited to them.
 */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-10 text-amber-70",
    APPROVED: "bg-emerald-10 text-emerald-70",
    CONFIRMED: "bg-emerald-10 text-emerald-70",
    REJECTED: "bg-red-10 text-red-70",
    DECLINED: "bg-red-10 text-red-70",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${styles[status] ?? "bg-neutral-grey-20 text-text-grey"}`}>
      {status.toLowerCase()}
    </span>
  );
}

function AlbumsSection({
  albums,
  media,
  onAlbumsChange,
}: {
  albums: VendorAlbumSelf[];
  media: MediaItem[];
  onAlbumsChange: (albums: VendorAlbumSelf[]) => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedAlbumId, setExpandedAlbumId] = useState<string | null>(null);
  const [savingMediaId, setSavingMediaId] = useState<string | null>(null);

  const unassignedMedia = media.filter((m) => m.albumId === null);

  async function handleCreateAlbum(event: React.FormEvent) {
    event.preventDefault();
    if (!newAlbumName.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createMyAlbum({ name: newAlbumName.trim(), visibility: "PUBLIC" });
    setCreating(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onAlbumsChange([...albums, { ...result.data, media: [] }]);
    setNewAlbumName("");
    setExpandedAlbumId(result.data.id);
  }

  async function handleAddToAlbum(albumId: string, mediaId: string) {
    setSavingMediaId(mediaId);
    const result = await updateMedia(mediaId, { albumId });
    setSavingMediaId(null);
    if (result.success) router.refresh();
  }

  async function handleRemoveFromAlbum(mediaId: string) {
    setSavingMediaId(mediaId);
    const result = await updateMedia(mediaId, { albumId: null });
    setSavingMediaId(null);
    if (result.success) router.refresh();
  }

  async function handleSetCover(albumId: string, mediaId: string) {
    const result = await updateMyAlbum(albumId, { coverMediaId: mediaId });
    if (result.success) {
      onAlbumsChange(albums.map((a) => (a.id === albumId ? { ...a, coverMediaId: mediaId } : a)));
    }
  }

  async function handleDeleteAlbum(albumId: string) {
    if (!window.confirm("Delete this album? Photos in it return to your unassigned portfolio, not deleted.")) return;
    const result = await deleteMyAlbum(albumId);
    if (result.success) {
      onAlbumsChange(albums.filter((a) => a.id !== albumId));
      router.refresh();
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-base font-bold">Albums</h2>
      <p className="mb-4 text-xs text-text-grey">
        Group your portfolio photos into named albums — a public album with a cover photo is what you submit as a Real
        Story below.
      </p>

      <form onSubmit={handleCreateAlbum} className="mb-4 flex gap-2">
        <input
          value={newAlbumName}
          onChange={(e) => setNewAlbumName(e.target.value)}
          placeholder="e.g. Anjali & Rohit's Wedding"
          maxLength={150}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={creating || !newAlbumName.trim()}
          className="rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {creating ? "Creating…" : "+ New album"}
        </button>
      </form>
      {error && <p className="mb-3 text-[13px] text-red-70">{error}</p>}

      {albums.length === 0 ? (
        <p className="text-sm text-text-grey">No albums yet — create one above to get started.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {albums.map((album) => {
            const isExpanded = expandedAlbumId === album.id;
            const cover = album.media.find((m) => m.id === album.coverMediaId);
            return (
              <div key={album.id} className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setExpandedAlbumId(isExpanded ? null : album.id)}
                  className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-surface-input">
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPublicMediaUrl(cover.thumbnailObjectKey ?? cover.optimizedObjectKey ?? cover.originalObjectKey)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{album.name}</p>
                      <p className="text-xs text-text-grey">
                        {album.media.length} photo{album.media.length === 1 ? "" : "s"}
                        {!album.coverMediaId && " · no cover set"}
                      </p>
                    </div>
                  </div>
                  <span className="text-text-grey">{isExpanded ? "▾" : "▸"}</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-neutral-grey-20 p-3.5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold text-text-grey">Photos in this album</p>
                      <button
                        type="button"
                        onClick={() => handleDeleteAlbum(album.id)}
                        className="text-[11px] font-semibold text-red-70 hover:underline"
                      >
                        Delete album
                      </button>
                    </div>
                    {album.media.length === 0 ? (
                      <p className="mb-3 text-xs text-text-grey">No photos assigned yet.</p>
                    ) : (
                      <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {album.media.map((item) => (
                          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-md bg-surface-input">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getPublicMediaUrl(item.thumbnailObjectKey ?? item.optimizedObjectKey ?? item.originalObjectKey)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            {album.coverMediaId === item.id && (
                              <span className="absolute top-1 left-1 rounded bg-brand-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
                                Cover
                              </span>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                              {album.coverMediaId !== item.id && (
                                <button
                                  type="button"
                                  onClick={() => handleSetCover(album.id, item.id)}
                                  className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-text-dark"
                                >
                                  Set cover
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={savingMediaId === item.id}
                                onClick={() => handleRemoveFromAlbum(item.id)}
                                className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-text-dark disabled:opacity-60"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mb-2 text-xs font-bold text-text-grey">Add from your unassigned portfolio photos</p>
                    {unassignedMedia.length === 0 ? (
                      <p className="text-xs text-text-grey">
                        No unassigned photos — upload more on the{" "}
                        <a href="/vendor/portfolio" className="font-bold text-brand-primary no-underline">
                          Portfolio
                        </a>{" "}
                        page first.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {unassignedMedia.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            disabled={savingMediaId === item.id}
                            onClick={() => handleAddToAlbum(album.id, item.id)}
                            className="group relative aspect-square overflow-hidden rounded-md bg-surface-input disabled:opacity-60"
                            title="Add to this album"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getPublicMediaUrl(item.thumbnailObjectKey ?? item.optimizedObjectKey ?? item.originalObjectKey)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg font-bold text-white opacity-0 group-hover:opacity-100">
                              +
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface CollaboratorPick {
  id: string;
  businessName: string;
}

function SubmitStorySection({ albums }: { albums: VendorAlbumSelf[] }) {
  const router = useRouter();
  const eligibleAlbums = albums.filter((a) => a.visibility === "PUBLIC" && a.coverMediaId);

  const [albumId, setAlbumId] = useState(eligibleAlbums[0]?.id ?? "");
  const [coupleName, setCoupleName] = useState("");
  const [location, setLocation] = useState("");
  const [tag, setTag] = useState("");
  const [snippet, setSnippet] = useState("");
  const [collaboratorQuery, setCollaboratorQuery] = useState("");
  const [collaboratorResults, setCollaboratorResults] = useState<CollaboratorPick[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorPick[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSearchCollaborators() {
    const q = collaboratorQuery.trim();
    if (!q) return;
    setSearching(true);
    const result = await searchVendorsClient({ keyword: q, limit: 5 });
    setSearching(false);
    if (result.success) {
      setCollaboratorResults(
        result.data
          .filter((v: { id: string }) => !selectedCollaborators.some((c) => c.id === v.id))
          .map((v: { id: string; businessName: string }) => ({ id: v.id, businessName: v.businessName })),
      );
    }
  }

  function addCollaborator(vendor: CollaboratorPick) {
    setSelectedCollaborators((prev) => [...prev, vendor]);
    setCollaboratorResults((prev) => prev.filter((v) => v.id !== vendor.id));
    setCollaboratorQuery("");
  }

  function removeCollaborator(vendorId: string) {
    setSelectedCollaborators((prev) => prev.filter((v) => v.id !== vendorId));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!albumId) {
      setError("Select an album to submit.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitMyWeddingStory({
      albumId,
      coupleName: coupleName.trim(),
      location: location.trim(),
      tag: tag.trim(),
      snippet: snippet.trim(),
      collaboratorVendorIds: selectedCollaborators.map((c) => c.id),
    });
    setSubmitting(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setSuccess(true);
    setCoupleName("");
    setLocation("");
    setTag("");
    setSnippet("");
    setSelectedCollaborators([]);
    router.refresh();
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-white p-4 sm:p-6">
      <h2 className="mb-1 text-base font-bold">Submit a Real Story</h2>
      <p className="mb-4 text-xs text-text-grey">
        Pick one of your public albums (with a cover set) and tell the story behind it. Submissions are reviewed by
        our team before going live.
      </p>

      {eligibleAlbums.length === 0 ? (
        <p className="text-sm text-text-grey">
          You need a public album with a cover photo before you can submit a story — create one above first.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="mb-3.5 block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Album</span>
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            >
              {eligibleAlbums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-3.5 block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Couple&apos;s name</span>
            <input
              required
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              maxLength={200}
              placeholder="e.g. Anjali & Rohit"
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            />
          </label>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Location</span>
              <input
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
                placeholder="e.g. Kochi, Kerala"
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">Tag</span>
              <input
                required
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                maxLength={200}
                placeholder="e.g. Traditional Kerala Wedding"
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <label className="mb-4 block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Story snippet</span>
            <textarea
              required
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="A short, warm summary of the wedding..."
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            />
          </label>

          <div className="mb-4">
            <span className="mb-1.5 block font-bold text-[13px]">
              Tag other vendors <span className="font-normal text-text-grey">(optional)</span>
            </span>
            <p className="mb-2 text-xs text-text-grey">
              e.g. the venue or decorator for this wedding — they&apos;ll need to confirm before they&apos;re credited.
            </p>
            <div className="mb-2 flex gap-2">
              <input
                value={collaboratorQuery}
                onChange={(e) => setCollaboratorQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchCollaborators();
                  }
                }}
                placeholder="Search by business name…"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleSearchCollaborators}
                disabled={searching || !collaboratorQuery.trim()}
                className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold hover:bg-surface-input disabled:opacity-60"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            {collaboratorResults.length > 0 && (
              <div className="mb-2 flex flex-col gap-1 rounded-md border border-border p-2">
                {collaboratorResults.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => addCollaborator(v)}
                    className="rounded px-2 py-1.5 text-left text-[13px] hover:bg-surface-input"
                  >
                    + {v.businessName}
                  </button>
                ))}
              </div>
            )}
            {selectedCollaborators.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCollaborators.map((v) => (
                  <span
                    key={v.id}
                    className="flex items-center gap-1.5 rounded-full bg-brand-primary-soft px-3 py-1 text-[12px] font-semibold text-brand-primary"
                  >
                    {v.businessName}
                    <button type="button" onClick={() => removeCollaborator(v.id)} aria-label={`Remove ${v.businessName}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="mb-3.5 text-[13px] text-red-70">{error}</p>}
          {success && <p className="mb-3.5 text-[13px] font-semibold text-emerald-70">Submitted — awaiting review!</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit story"}
          </button>
        </form>
      )}
    </section>
  );
}

function MyStoriesSection({ stories }: { stories: WeddingStorySelf[] }) {
  if (stories.length === 0) return null;
  return (
    <section className="mb-6 rounded-xl border border-border bg-white p-4 sm:p-6">
      <h2 className="mb-4 text-base font-bold">Your submitted stories</h2>
      <div className="flex flex-col gap-3">
        {stories.map((story) => (
          <div key={story.id} className="rounded-lg border border-border p-3.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{story.coupleName}</p>
              <StatusBadge status={story.status} />
            </div>
            <p className="text-xs text-text-grey">
              {story.location} · {story.tag}
            </p>
            {story.status === "REJECTED" && story.rejectionReason && (
              <p className="mt-1.5 text-xs text-red-70">Reason: {story.rejectionReason}</p>
            )}
            {story.collaborators.length > 1 && (
              <p className="mt-1.5 text-xs text-text-grey">
                Collaborators:{" "}
                {story.collaborators.map((c) => `${c.vendor.businessName} (${c.status.toLowerCase()})`).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AwaitingConfirmationSection({
  stories,
  onDecided,
}: {
  stories: WeddingStorySelf[];
  onDecided: (storyId: string) => void;
}) {
  const router = useRouter();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (stories.length === 0) return null;

  async function handleRespond(storyId: string, decision: "CONFIRMED" | "DECLINED") {
    setRespondingId(storyId);
    setError(null);
    const result = await respondToStoryCollaboration(storyId, decision);
    setRespondingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onDecided(storyId);
    router.refresh();
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-30 bg-amber-10/30 p-4 sm:p-6">
      <h2 className="mb-1 text-base font-bold">Awaiting your confirmation</h2>
      <p className="mb-4 text-xs text-text-grey">
        Another vendor tagged you as a collaborator on their Real Story submission — confirm to be credited, or
        decline if this isn&apos;t right.
      </p>
      {error && <p className="mb-3 text-[13px] text-red-70">{error}</p>}
      <div className="flex flex-col gap-3">
        {stories.map((story) => (
          <div key={story.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-3.5">
            <div>
              <p className="text-sm font-bold">{story.coupleName}</p>
              <p className="text-xs text-text-grey">
                Submitted by {story.album.vendor.businessName} · {story.location}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={respondingId === story.id}
                onClick={() => handleRespond(story.id, "DECLINED")}
                className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-text-dark disabled:opacity-60"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={respondingId === story.id}
                onClick={() => handleRespond(story.id, "CONFIRMED")}
                className="rounded-md bg-brand-primary px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StoriesBoard({
  initialAlbums,
  media,
  initialSubmittedStories,
  initialAwaitingConfirmation,
}: {
  initialAlbums: VendorAlbumSelf[];
  media: MediaItem[];
  initialSubmittedStories: WeddingStorySelf[];
  initialAwaitingConfirmation: WeddingStorySelf[];
}) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(initialAwaitingConfirmation);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Real Stories</h1>
        <p className="text-sm text-text-grey">Share real weddings you&apos;ve worked on, and collaborate with other vendors on shared credit.</p>
      </div>

      <AwaitingConfirmationSection
        stories={awaitingConfirmation}
        onDecided={(storyId) => setAwaitingConfirmation((prev) => prev.filter((s) => s.id !== storyId))}
      />
      <AlbumsSection albums={albums} media={media} onAlbumsChange={setAlbums} />
      <SubmitStorySection albums={albums} />
      <MyStoriesSection stories={initialSubmittedStories} />
    </div>
  );
}
