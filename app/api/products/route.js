import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { INITIAL_PRODUCTS } from "@/lib/catalog-data";
import { mapProductPayload, mapProductRow } from "@/lib/supabase/mappers";

export async function GET() {
  try {
    const { rows } = await query(
      `select id, name, category, subcategory, emoji, image, description, price, stock
       from products
       order by id asc`,
    );

    return NextResponse.json({
      products: rows.map(mapProductRow),
      source: "database",
    });
  } catch (dbError) {
    return NextResponse.json({
      products: INITIAL_PRODUCTS,
      source: "local",
      warning: dbError.message || "Unable to fetch products from database",
    });
  }
}

export async function POST(request) {
  try {
    const { product } = await request.json();
    const payload = mapProductPayload(product);
    const { rows } = await query(
      `insert into products (name, category, subcategory, emoji, image, description, price, stock)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, name, category, subcategory, emoji, image, description, price, stock`,
      [
        payload.name,
        payload.category,
        payload.subcategory,
        payload.emoji,
        payload.image,
        payload.description,
        payload.price,
        payload.stock,
      ],
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
  try {
    const { product } = await request.json();
    const payload = mapProductPayload(product);
    const { rows } = await query(
      `update products
       set name = $1,
           category = $2,
           subcategory = $3,
           emoji = $4,
           image = $5,
           description = $6,
           price = $7,
           stock = $8
       where id = $9
       returning id, name, category, subcategory, emoji, image, description, price, stock`,
      [
        payload.name,
        payload.category,
        payload.subcategory,
        payload.emoji,
        payload.image,
        payload.description,
        payload.price,
        payload.stock,
        product.id,
      ],
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
  try {
    const { id } = await request.json();
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
