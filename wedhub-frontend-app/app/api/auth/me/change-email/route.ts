import { NextResponse } from "next/server";
import { backendAuthFetch, parseBackendJson } from "@/lib/auth/backend";
import { getAccessToken } from "@/lib/auth/session";

export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Missing or malformed authorization header" } },
      { status: 401 },
    );
  }

  const body = await request.json();

  const backendResponse = await backendAuthFetch("/me/change-email", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = await parseBackendJson<{ pending: true }>(backendResponse);
  return NextResponse.json(json, { status: backendResponse.status });
}
