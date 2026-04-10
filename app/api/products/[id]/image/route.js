import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export async function GET(_request, { params }) {
  const { id } = await params;

  try {
    const { rows } = await query("SELECT image FROM products WHERE id = $1", [id]);

    if (!rows[0] || !rows[0].image) {
      return new NextResponse(null, { status: 404 });
    }

    const image = rows[0].image;

    if (!image.startsWith("data:")) {
      return NextResponse.redirect(image);
    }

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);

    if (!match) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
