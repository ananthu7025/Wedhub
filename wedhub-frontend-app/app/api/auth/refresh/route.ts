import { NextResponse } from "next/server";
import { backendAuthFetch, parseBackendJson, rewriteRefreshCookiePath } from "@/lib/auth/backend";
import { clearAccessTokenCookie, setAccessTokenCookie } from "@/lib/auth/session";

interface RefreshResponseData {
  accessToken: string;
}

export async function POST(request: Request) {
  const refreshCookie = request.headers.get("cookie");

  const backendResponse = await backendAuthFetch("/refresh", {
    method: "POST",
    cookie: refreshCookie ?? undefined,
  });

  const json = await parseBackendJson<RefreshResponseData>(backendResponse);

  if (!json.success) {
    await clearAccessTokenCookie();
    return NextResponse.json(json, { status: backendResponse.status });
  }

  await setAccessTokenCookie(json.data.accessToken);

  const response = NextResponse.json({ success: true, data: {} });

  // Refresh tokens rotate on every use (see wedhub-backend's Arch Phase 2
  // notes) — the backend issues a new refresh_token cookie each call, so we
  // must forward it again, same as login.
  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", rewriteRefreshCookiePath(setCookie));

  return response;
}
