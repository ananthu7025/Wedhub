"use client";

import { useState } from "react";
import Image from "next/image";
import {
  createAdminAlbumForVendor,
  createAdminWeddingStory,
  deleteAdminWeddingStory,
  updateAdminAlbum,
  updateAdminWeddingStory,
} from "@/lib/api/admin-client";
import type { AdminAlbum, AdminVendorListItem, AdminWeddingStory } from "@/lib/api/admin.types";
import { getPublicMediaUrl, getObjectKeyFromPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";
import { VendorPhotoUploader } from "./VendorPhotoUploader";

interface FormValues {
  albumId: string;
  coupleName: string;
  location: string;
  tag: string;
  snippet: string;
  isFeatured: boolean;
}

export function WeddingStoriesBoard({
  initialStories,
  albums: initialAlbums,
  vendors,
}: {
  initialStories: AdminWeddingStory[];
  albums: AdminAlbum[];
  vendors: AdminVendorListItem[];
}) {
  const [stories, setStories] = useState(initialStories);
  const [albums, setAlbums] = useState(initialAlbums);
  const [adding, setAdding] = useState(false);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const albumsWithoutCover = albums.filter((a) => !a.coverMedia);
  const usableAlbums = albums.filter((a) => a.coverMedia);

  function handleAlbumCreated(album: AdminAlbum) {
    setAlbums((prev) => [album, ...prev]);
    setCreatingAlbum(false);
  }

  async function handleCreate(values: FormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminWeddingStory(values);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setStories((prev) => [...prev, result.data]);
    setAdding(false);
  }

  async function handleUpdate(story: AdminWeddingStory, values: Omit<FormValues, "albumId">) {
    setPendingId(story.id);
    setError(null);
    const result = await updateAdminWeddingStory(story.id, values);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setStories((prev) => prev.map((s) => (s.id === story.id ? result.data : s)));
    setEditingId(null);
  }

  async function handleToggleFeatured(story: AdminWeddingStory) {
    setPendingId(story.id);
    setError(null);
    const result = await updateAdminWeddingStory(story.id, { isFeatured: !story.isFeatured });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setStories((prev) => prev.map((s) => (s.id === story.id ? result.data : s)));
  }

  async function handleDelete(story: AdminWeddingStory) {
    setPendingId(story.id);
    setError(null);
    const result = await deleteAdminWeddingStory(story.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setStories((prev) => prev.filter((s) => s.id !== story.id));
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</div>}

      {stories.length === 0 && !adding && <p className="mb-3 text-sm text-text-grey">No wedding stories yet.</p>}

      <div className="mb-3 flex flex-col gap-3">
        {stories.map((story) =>
          editingId === story.id ? (
            <StoryForm
              key={story.id}
              initial={story}
              saving={pendingId === story.id}
              onCancel={() => setEditingId(null)}
              onSubmit={(values) => handleUpdate(story, values)}
            />
          ) : (
            <div key={story.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-surface-input">
                <Image
                  src={getPublicMediaUrl(
                    story.album.coverMedia.optimizedObjectKey ?? story.album.coverMedia.originalObjectKey,
                  )}
                  alt={story.coupleName}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {story.coupleName}
                  {story.isFeatured && (
                    <span className="rounded-full bg-emerald-10 px-2 py-0.5 text-[10px] font-bold text-emerald-70">
                      Featured on homepage
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-text-grey">
                  {story.location} · {story.tag} · {story.album.vendor.businessName}
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  disabled={pendingId === story.id}
                  onClick={() => handleToggleFeatured(story)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
                    story.isFeatured
                      ? "border border-border bg-white text-text-dark hover:bg-surface-input"
                      : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                  }`}
                >
                  {story.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === story.id}
                  onClick={() => setEditingId(story.id)}
                  className="text-[11px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pendingId === story.id}
                  onClick={() => handleDelete(story)}
                  className="text-[11px] font-bold text-red hover:underline disabled:opacity-60"
                >
                  {pendingId === story.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <StoryForm
          albums={usableAlbums}
          saving={pendingId === "new"}
          onCancel={() => setAdding(false)}
          onSubmit={handleCreate}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={usableAlbums.length === 0}
          className="text-xs font-bold text-brand-primary hover:underline disabled:cursor-not-allowed disabled:text-text-grey disabled:no-underline"
        >
          + Add wedding story
        </button>
      )}

      {usableAlbums.length === 0 && (
        <p className="mt-2 text-xs text-text-grey">
          No public vendor albums with a cover image are available yet — a vendor needs a public album with a real
          cover photo set before it can be featured here.
        </p>
      )}
      {albumsWithoutCover.length > 0 && (
        <p className="mt-1 text-xs text-text-grey">
          {albumsWithoutCover.length} public album{albumsWithoutCover.length === 1 ? "" : "s"} exist
          {albumsWithoutCover.length === 1 ? "s" : ""} with no cover image set, so {albumsWithoutCover.length === 1 ? "it isn't" : "they aren't"}{" "}
          selectable yet.
        </p>
      )}

      <div className="mt-3 rounded-md border border-dashed border-border p-3">
        {creatingAlbum ? (
          <NewAlbumFromPhoto vendors={vendors} onCancel={() => setCreatingAlbum(false)} onCreated={handleAlbumCreated} />
        ) : (
          <button
            type="button"
            onClick={() => setCreatingAlbum(true)}
            className="text-xs font-bold text-brand-primary hover:underline"
          >
            + Create a new album from a vendor photo
          </button>
        )}
      </div>
    </div>
  );
}

// Cold-start seeding: creates a real public Album for a chosen vendor,
// uploads a real photo onto it, and sets that photo as the album's cover —
// all in one flow, so the album becomes immediately usable in the "Add
// wedding story" form above without leaving this screen.
function NewAlbumFromPhoto({
  vendors,
  onCancel,
  onCreated,
}: {
  vendors: AdminVendorListItem[];
  onCancel: () => void;
  onCreated: (album: AdminAlbum) => void;
}) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [albumName, setAlbumName] = useState("");
  const [pendingAlbum, setPendingAlbum] = useState<{ id: string; vendorId: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateAlbum(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!vendorId || !albumName.trim()) {
      setError("Select a vendor and name the album");
      return;
    }
    const result = await createAdminAlbumForVendor({ vendorId, name: albumName.trim(), visibility: "PUBLIC" });
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPendingAlbum({ id: result.data.id, vendorId: result.data.vendorId, name: result.data.name });
  }

  async function handlePhotoUploaded(media: { id: string; url: string }) {
    if (!pendingAlbum) return;
    setError(null);
    const result = await updateAdminAlbum(pendingAlbum.id, { coverMediaId: media.id });
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    const vendor = vendors.find((v) => v.id === pendingAlbum.vendorId);
    onCreated({
      id: pendingAlbum.id,
      vendorId: pendingAlbum.vendorId,
      name: pendingAlbum.name,
      description: null,
      coverMediaId: media.id,
      visibility: "PUBLIC",
      vendor: vendor ? { id: vendor.id, businessName: vendor.businessName, slug: vendor.slug } : { id: pendingAlbum.vendorId, businessName: "", slug: "" },
      coverMedia: {
        id: media.id,
        optimizedObjectKey: null,
        thumbnailObjectKey: null,
        originalObjectKey: getObjectKeyFromPublicMediaUrl(media.url),
      },
    });
  }

  if (pendingAlbum) {
    return (
      <div>
        <p className="mb-2 text-[11px] font-semibold text-text-grey">
          Album &quot;{pendingAlbum.name}&quot; created — now upload a photo to use as its cover.
        </p>
        <VendorPhotoUploader
          vendors={vendors.filter((v) => v.id === pendingAlbum.vendorId)}
          albumId={pendingAlbum.id}
          onUploaded={handlePhotoUploaded}
        />
        {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleCreateAlbum} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Vendor</span>
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="rounded-md border border-border px-2 py-1.5 text-xs"
        >
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.businessName}
            </option>
          ))}
        </select>
      </label>
      <label className="block flex-1">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Album name</span>
        <input
          value={albumName}
          onChange={(e) => setAlbumName(e.target.value)}
          maxLength={150}
          placeholder="Wedding Shoots"
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white">
          Create album
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
    </form>
  );
}

function StoryForm({
  initial,
  albums,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: AdminWeddingStory;
  albums?: AdminAlbum[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues) => void;
}) {
  const [albumId, setAlbumId] = useState(albums?.[0]?.id ?? "");
  const [coupleName, setCoupleName] = useState(initial?.coupleName ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [snippet, setSnippet] = useState(initial?.snippet ?? "");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!initial && !albumId) {
      setValidationError("Select an album");
      return;
    }
    if (!coupleName.trim() || !location.trim() || !tag.trim() || !snippet.trim()) {
      setValidationError("All fields are required");
      return;
    }

    onSubmit({
      albumId,
      coupleName: coupleName.trim(),
      location: location.trim(),
      tag: tag.trim(),
      snippet: snippet.trim(),
      isFeatured,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}

      {!initial && albums && (
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Album (public, real vendor photos)</span>
          <select
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          >
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name} — {album.vendor.businessName}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Couple names</span>
          <input
            value={coupleName}
            onChange={(e) => setCoupleName(e.target.value)}
            maxLength={200}
            placeholder="Ananya & Rohan"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={200}
            placeholder="Palace Grounds, Bengaluru"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Tag</span>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          maxLength={200}
          placeholder="South Indian Traditional · 120 Photos"
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
        />
      </label>

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Snippet</span>
        <textarea
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="A grand floral celebration featuring traditional kanjeevaram silk..."
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
        />
      </label>

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
          {saving ? "Saving…" : initial ? "Save" : "Add story"}
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
