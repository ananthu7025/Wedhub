import { NextResponse } from "next/server";
import { backendAuthFetch, rewriteRefreshCookiePath } from "@/lib/auth/backend";
import { clearAccessTokenCookie, getAccessToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing or malformed authorization header" } },
      { status: 401 },
    );
  }

  const refreshCookie = request.headers.get("cookie");

  const backendResponse = await backendAuthFetch("/logout-all", {
    method: "POST",
    cookie: refreshCookie ?? undefined,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!backendResponse.ok) {
    const body = await backendResponse.text();
    return new NextResponse(body, {
      status: backendResponse.status,
      headers: { "Content-Type": backendResponse.headers.get("content-type") ?? "application/json" },
    });
  }

  await clearAccessTokenCookie();

  const response = NextResponse.json({ success: true, data: { loggedOut: true } });

  // Forward the backend's clearCookie response so the browser drops
  // refresh_token too, not just our session cookie (same pattern as
  // app/api/auth/logout/route.ts).
  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", rewriteRefreshCookiePath(setCookie));

  return response;
}
