import { NextResponse } from "next/server";
import { backendAuthFetch, parseBackendJson } from "@/lib/auth/backend";
import type { AuthenticatedUser } from "@/lib/auth/types";

interface RegisterResponseData {
  user: AuthenticatedUser;
}

export async function POST(request: Request) {
  const body = await request.json();

  const backendResponse = await backendAuthFetch("/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const json = await parseBackendJson<RegisterResponseData>(backendResponse);

  // Registration does not log the user in (no tokens returned by the
  // backend, see wedhub-backend/src/modules/auth/auth.controller.ts) — the
  // frontend should route the user to login after a successful signup.
  return NextResponse.json(json, { status: backendResponse.status });
}
