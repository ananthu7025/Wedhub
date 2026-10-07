import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const body = await request.json();

  const backendResponse = await fetch(`${API_URL}/api/v1/vendors/claim/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await backendResponse.json();
  return NextResponse.json(json, { status: backendResponse.status });
}
