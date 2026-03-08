import { NextResponse } from "next/server";

import {
  attachAdminSessionCookie,
  isAdminSessionConfigured,
} from "@/lib/admin-auth";

export async function POST(request) {
  let payload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const adminAccessCode = process.env.ADMIN_ACCESS_CODE?.trim();
  const submittedCode = String(payload.code || "").trim();

  if (!adminAccessCode || !isAdminSessionConfigured()) {
    return NextResponse.json(
      { error: "Configuration admin incomplète sur le serveur." },
      { status: 500 },
    );
  }

  if (!submittedCode) {
    return NextResponse.json({ error: "Code administrateur requis" }, { status: 400 });
  }

  if (submittedCode !== adminAccessCode) {
    return NextResponse.json({ error: "Code administrateur incorrect" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  if (!attachAdminSessionCookie(response)) {
    return NextResponse.json(
      { error: "Impossible d'ouvrir la session administrateur." },
      { status: 500 },
    );
  }

  return response;
}
