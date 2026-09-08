import { NextResponse, type NextRequest } from "next/server";
import { rewriteRefreshCookiePath } from "@/lib/auth/backend";
import { getAccessToken, setAccessTokenCookie } from "@/lib/auth/session";
import type { ApiResponse } from "@/lib/api/types";
import type { ChallengeEntry } from "@/lib/api/challenges.types";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SubmitEntryResponseData {
  entry: ChallengeEntry;
  accessToken?: string;
}

/**
 * Dedicated Route Handler (NOT the generic app/api/[...path]/route.ts proxy)
 * for POST /challenges/:slug/entries specifically, because a no-vendor
 * caller's submission can flip their User.role END_USER -> VENDOR mid-request
 * (see challenge-entry.vendor-bootstrap.ts) and mint a fresh access+refresh
 * token pair the caller's *current* session cookie doesn't reflect yet. The
 * generic proxy has no way to intercept and apply that — this handler does,
 * mirroring app/api/auth/login/route.ts's cookie-swap exactly.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = await request.text();

  const accessToken = await getAccessToken();
  const backendResponse = await fetch(`${API_URL}/api/v1/challenges/${slug}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
  });

  const json = (await backendResponse.json()) as ApiResponse<SubmitEntryResponseData>;

  if (!json.success) {
    return NextResponse.json(json, { status: backendResponse.status });
  }

  if (json.data.accessToken) {
    await setAccessTokenCookie(json.data.accessToken);
  }

  const response = NextResponse.json(
    { success: true, data: { entry: json.data.entry } },
    { status: backendResponse.status },
  );

  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", rewriteRefreshCookiePath(setCookie));

  return response;
}
