import { NextResponse } from "next/server";
import { rewriteRefreshCookiePath } from "@/lib/auth/backend";
import { setAccessTokenCookie } from "@/lib/auth/session";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ClaimRegisterResponseData {
  userId: string;
  vendorId: string;
  accessToken: string;
}

// Mirrors app/api/auth/login/route.ts's cookie-forwarding pattern: the
// backend's claimByRegister (vendor-claim.controller.ts) calls the same
// setRefreshCookie() login/register use — path is always scoped to
// /api/v1/auth regardless of which controller calls it (see
// auth.controller.ts) — so this needs the identical Set-Cookie proxy + path
// rewrite as a real login, not a lighter-weight pass-through.
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendResponse = await fetch(`${API_URL}/api/v1/vendors/claim/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await backendResponse.json()) as
      | { success: true; data: ClaimRegisterResponseData }
      | { success: false; error: { code: string; message: string } };

    if (!json.success) {
      return NextResponse.json(json, { status: backendResponse.status });
    }

    await setAccessTokenCookie(json.data.accessToken);

    const response = NextResponse.json({
      success: true,
      data: { vendorId: json.data.vendorId },
    } satisfies { success: true; data: { vendorId: string } });

    const setCookie = backendResponse.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", rewriteRefreshCookiePath(setCookie));

    return response;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CLAIM_SERVICE_UNAVAILABLE",
          message: err instanceof Error ? err.message : "Claim service is currently unavailable",
        },
      },
      { status: 503 },
    );
  }
}
