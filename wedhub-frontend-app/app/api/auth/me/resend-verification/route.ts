import { NextResponse } from "next/server";
import { backendAuthFetch, parseBackendJson } from "@/lib/auth/backend";
import { getAccessToken } from "@/lib/auth/session";

export async function POST() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing or malformed authorization header" } },
      { status: 401 },
    );
  }

  const backendResponse = await backendAuthFetch("/me/resend-verification", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await parseBackendJson<{ sent: true }>(backendResponse);
  return NextResponse.json(json, { status: backendResponse.status });
}
