import { NextResponse } from "next/server";
import { backendAuthFetch, parseBackendJson, rewriteRefreshCookiePath } from "@/lib/auth/backend";
import { setAccessTokenCookie } from "@/lib/auth/session";
import type { AuthenticatedUser } from "@/lib/auth/types";

interface LoginResponseData {
  user: AuthenticatedUser;
  accessToken: string;
}

export async function POST(request: Request) {
  const body = await request.json();

  const backendResponse = await backendAuthFetch("/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const json = await parseBackendJson<LoginResponseData>(backendResponse);

  if (!json.success) {
    return NextResponse.json(json, { status: backendResponse.status });
  }

  await setAccessTokenCookie(json.data.accessToken);

  const response = NextResponse.json({ success: true, data: { user: json.data.user } });

  // Forward the backend's own httpOnly refresh_token cookie straight through
  // to the browser, scoped to our origin — see frontenddocs/10-risks-and-open-questions.md
  // Open Question 4 for why this has to be proxied rather than called directly.
  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", rewriteRefreshCookiePath(setCookie));

  return response;
}
