"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitMyVendor } from "@/lib/api/vendor-self-client";
import type { VendorStatus } from "@/lib/api/vendor-self.types";
import { ApiRequestError } from "@/lib/api/types";
import { formatApiError } from "@/lib/utils/error";

/**
 * POST /vendors/me/submit — only meaningful from DRAFT/REJECTED (the
 * backend itself enforces this, 409s otherwise). Real validation errors
 * (missing required fields) come back as details.missing, an array of the
 * exact label strings from vendor.completeness.ts's REQUIRED_FOR_SUBMISSION_LABELS
 * — surfaced verbatim rather than re-deriving them client-side.
 */
export function SubmitBar({ vendorStatus }: { vendorStatus: VendorStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [missing, setMissing] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  if (vendorStatus !== "DRAFT" && vendorStatus !== "REJECTED") {
    return null;
  }

  async function handleSubmit() {
    setStatus("submitting");
    setErrorMessage("");
    setMissing([]);

    try {
      const result = await submitMyVendor();
      if (!result.success) {
        setStatus("error");
        setErrorMessage(formatApiError(result.error));
        const missingDetail = result.error.details?.missing;
        if (Array.isArray(missingDetail)) setMissing(missingDetail as string[]);
        return;
      }
      router.push("/vendor/dashboard");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof ApiRequestError
          ? formatApiError({ code: error.code, message: error.message, details: error.details })
          : "Something went wrong",
      );
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h3 className="mb-1 text-base font-bold">Submit for review</h3>
      <p className="mb-4 text-[13px] text-text-grey">
        Once you&apos;ve filled in the required fields, submit your listing for admin approval.
      </p>
      {status === "error" && (
        <div className="mb-3.5 rounded-md bg-red-10 p-3.5 text-[13px] text-red-70">
          <p className="mb-1 font-semibold">{errorMessage}</p>
          {missing.length > 0 && (
            <ul className="ml-4 list-disc">
              {missing.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === "submitting"}
        className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting…" : "Submit for review"}
      </button>
      <p className="mt-2.5 text-xs text-text-grey">Save your changes first if you&apos;ve made any.</p>
    </div>
  );
}
