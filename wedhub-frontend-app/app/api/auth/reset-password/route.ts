import { NextResponse } from "next/server";
import { backendAuthFetch, parseBackendJson } from "@/lib/auth/backend";

export async function POST(request: Request) {
  const body = await request.json();
  const backendResponse = await backendAuthFetch("/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await parseBackendJson<{ passwordReset: true }>(backendResponse);
  return NextResponse.json(json, { status: backendResponse.status });
}
