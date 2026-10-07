import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ResolveInvitationData {
  vendorId: string;
  businessName: string;
  invitedEmail: string | null;
  invitedPhone: string | null;
}

// GET so the claim page's initial load can resolve the token and show a
// friendly "invalid or expired" state instead of a raw error — see
// wedhub-backend's vendor-claim.controller.ts::resolveInvitation
// (GET /vendors/claim/:token). The invitedEmail/invitedPhone this returns
// are already masked server-side (see vendor-claim.service.ts's
// maskEmail/maskPhone) — never the full contact value, since this endpoint
// is reachable before any OTP has proven ownership of it.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_TOKEN", message: "Missing claim token" } },
      { status: 400 },
    );
  }

  const backendResponse = await fetch(`${API_URL}/api/v1/vendors/claim/${encodeURIComponent(token)}`, {
    method: "GET",
  });

  const json = (await backendResponse.json()) as
    | { success: true; data: ResolveInvitationData }
    | { success: false; error: { code: string; message: string } };

  return NextResponse.json(json, { status: backendResponse.status });
}
