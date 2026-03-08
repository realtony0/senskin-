import { NextResponse } from "next/server";

import {
  clearAdminSessionCookie,
  verifyAdminSessionRequest,
} from "@/lib/admin-auth";

export async function GET(request) {
  const verification = verifyAdminSessionRequest(request);

  if (!verification.ok) {
    const response = NextResponse.json(
      { error: "Session administrateur invalide ou expirée." },
      { status: 401 },
    );
    clearAdminSessionCookie(response);
    return response;
  }

  return NextResponse.json({ ok: true, expiresAt: verification.expiresAt });
}
