import { NextResponse } from "next/server";
import { backendAuthFetch, rewriteRefreshCookiePath } from "@/lib/auth/backend";
import { clearAccessTokenCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  const refreshCookie = request.headers.get("cookie");

  const backendResponse = await backendAuthFetch("/logout", {
    method: "POST",
    cookie: refreshCookie ?? undefined,
  });

  await clearAccessTokenCookie();

  const response = NextResponse.json({ success: true, data: { loggedOut: true } });

  // Forward the backend's clearCookie response so the browser drops
  // refresh_token too, not just our session cookie.
  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", rewriteRefreshCookiePath(setCookie));

  return response;
}
