import { NextResponse } from "next/server";
import { backendAuthFetch, parseBackendJson, rewriteRefreshCookiePath } from "@/lib/auth/backend";
import { setAccessTokenCookie } from "@/lib/auth/session";
import type { AuthenticatedUser } from "@/lib/auth/types";

interface GoogleLoginResponseData {
  user: AuthenticatedUser;
  accessToken: string;
}

export async function POST(request: Request) {
  const body = await request.json();

  const backendResponse = await backendAuthFetch("/google", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const json = await parseBackendJson<GoogleLoginResponseData>(backendResponse);

  if (!json.success) {
    return NextResponse.json(json, { status: backendResponse.status });
  }

  await setAccessTokenCookie(json.data.accessToken);

  const response = NextResponse.json({ success: true, data: { user: json.data.user } });

  // Same dual-cookie rewrite as /api/auth/login — see backend.ts's
  // rewriteRefreshCookiePath doc comment for why this is required.
  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", rewriteRefreshCookiePath(setCookie));

  return response;
}
