"use client";

import { useRef, useState } from "react";
import { confirmAdminVendorUpload, createAdminVendorUploadRequest } from "@/lib/api/admin-client";
import type { AdminVendorListItem } from "@/lib/api/admin.types";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Cold-start seeding for Wedding Stories / Gallery Inspiration (Arch
 * Phase 17): both curation screens only ever show real, already-approved
 * vendor media — by design, not a bug — so on a fresh platform with no
 * vendor-uploaded photos yet, there is nothing to pick from. This lets an
 * admin upload a real photo directly onto a chosen vendor's profile
 * (same R2 presign -> PUT -> confirm flow as CategoryImagePicker.tsx),
 * producing a normal PORTFOLIO Media row, auto-approved since it's
 * admin-sourced. Reported back via onUploaded once processing finishes
 * (status becomes READY) so the caller can use the real mediaId right away.
 */
export function VendorPhotoUploader({
  vendors,
  albumId,
  onUploaded,
}: {
  vendors: AdminVendorListItem[];
  albumId?: string;
  onUploaded: (media: { id: string; url: string }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !vendorId) return;

    setError("");
    setUploading(true);

    const requestResult = await createAdminVendorUploadRequest({
      vendorId,
      albumId,
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    if (!requestResult.success) {
      setError(requestResult.error.message);
      setUploading(false);
      return;
    }

    const { mediaId, uploadUrl } = requestResult.data;
    const putResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!putResponse.ok) {
      setError("Upload to storage failed");
      setUploading(false);
      return;
    }

    // Processing (resize/optimize) happens async on the worker — poll
    // briefly since the optimized url isn't ready the instant confirm
    // returns (status starts PROCESSING, not READY). Same pattern as
    // CategoryImagePicker.tsx.
    let confirmed = await confirmAdminVendorUpload(mediaId);
    for (let attempt = 0; attempt < 10 && confirmed.success && !confirmed.data.url; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      confirmed = await confirmAdminVendorUpload(mediaId);
    }

    if (!confirmed.success) {
      setError(confirmed.error.message);
      setUploading(false);
      return;
    }
    if (!confirmed.data.url) {
      setError("Photo is still processing — try again in a few seconds.");
      setUploading(false);
      return;
    }

    onUploaded({ id: confirmed.data.id, url: confirmed.data.url });
    setUploading(false);
  }

  if (vendors.length === 0) {
    return <p className="text-xs text-text-grey">No approved vendors exist yet to upload a photo for.</p>;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={vendorId}
        onChange={(e) => setVendorId(e.target.value)}
        disabled={uploading}
        className="rounded-md border border-border px-2 py-1.5 text-xs disabled:opacity-60"
      >
        {vendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.businessName}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !vendorId}
        className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface-input disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Upload a photo for this vendor"}
      </button>
      {error && <p className="text-xs text-red">{error}</p>}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} hidden onChange={handleFileSelect} />
    </div>
  );
}
