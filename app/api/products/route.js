import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { mapProductPayload, mapProductRow } from "@/lib/supabase/mappers";

const SELECT_COLUMNS = "id, name, category, subcategory, emoji, image, description, price, stock";

const MUTATION_COLUMNS = ["name", "category", "subcategory", "emoji", "image", "description", "price", "stock"];

function getMutationValues(payload) {
  return [
    payload.name,
    payload.category,
    payload.subcategory,
    payload.emoji,
    payload.image,
    payload.description,
    payload.price,
    payload.stock,
  ];
}

export async function GET() {
  try {
    const { rows } = await query(
      `select ${SELECT_COLUMNS} from products order by id asc`,
    );

    return NextResponse.json({
      products: rows.map(mapProductRow),
      source: "database",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load products" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { product } = await request.json();
  const payload = mapProductPayload(product);

  try {
    const placeholders = MUTATION_COLUMNS.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await query(
      `insert into products (${MUTATION_COLUMNS.join(", ")})
       values (${placeholders})
       returning ${SELECT_COLUMNS}`,
      getMutationValues(payload),
    );

    return NextResponse.json({ product: mapProductRow(rows[0]) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to create product" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { product } = await request.json();
  const payload = mapProductPayload(product);

  try {
    const assignments = MUTATION_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const { rows } = await query(
      `update products
       set ${assignments}
       where id = $${MUTATION_COLUMNS.length + 1}
       returning ${SELECT_COLUMNS}`,
      [...getMutationValues(payload), product.id],
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: mapProductRow(rows[0]) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await request.json();

  try {
    const result = await query("delete from products where id = $1", [id]);

    if (!result.rowCount) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to delete product" },
      { status: 500 },
    );
  }
}
