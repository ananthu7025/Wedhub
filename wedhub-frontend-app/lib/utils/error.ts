/**
 * Extracts a friendly, descriptive error message from an API response,
 * unpacking field-level validation errors from backend Zod schemas.
 *
 * Backend returns:
 * {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Validation failed",
 *     details: {
 *       website: ["Invalid url"],
 *       phone: ["String must contain at least 6 character(s)"]
 *     }
 *   }
 * }
 *
 * This turns that into:
 * "Validation failed: website: Invalid url; phone: String must contain at least 6 character(s)"
 */
export function formatApiError(
  error?: { message?: string; details?: Record<string, unknown>; code?: string } | null,
): string {
  if (!error) return "An unexpected error occurred.";

  if (error.details && typeof error.details === "object" && !Array.isArray(error.details)) {
    const fieldMessages: string[] = [];

    for (const [field, msgs] of Object.entries(error.details)) {
      if (Array.isArray(msgs)) {
        const cleanMsgs = msgs.filter((m) => typeof m === "string");
        if (cleanMsgs.length > 0) {
          fieldMessages.push(`${field}: ${cleanMsgs.join(", ")}`);
        }
      } else if (typeof msgs === "string") {
        fieldMessages.push(`${field}: ${msgs}`);
      } else if (msgs && typeof msgs === "object") {
        try {
          fieldMessages.push(`${field}: ${JSON.stringify(msgs)}`);
        } catch {
          // ignore stringify errors
        }
      }
    }

    if (fieldMessages.length > 0) {
      const baseMsg = error.message && error.message !== "Validation failed" ? error.message : "Validation error";
      return `${baseMsg}: ${fieldMessages.join("; ")}`;
    }
  }

  return error.message || "An unexpected error occurred.";
}
