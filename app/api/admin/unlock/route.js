import { NextResponse } from "next/server";

export async function POST(request) {
  let payload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const adminAccessCode = process.env.ADMIN_ACCESS_CODE?.trim();
  const submittedCode = String(payload.code || "").trim();

  if (!adminAccessCode) {
    return NextResponse.json(
      { error: "Le code administrateur n'est pas configuré sur le serveur." },
      { status: 500 },
    );
  }

  if (!submittedCode) {
    return NextResponse.json({ error: "Code administrateur requis" }, { status: 400 });
  }

  if (submittedCode !== adminAccessCode) {
    return NextResponse.json({ error: "Code administrateur incorrect" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
