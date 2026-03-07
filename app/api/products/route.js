import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { INITIAL_PRODUCTS } from "@/lib/catalog-data";
import { mapProductPayload, mapProductRow } from "@/lib/supabase/mappers";
import {
  createServiceSupabaseClient,
  hasServiceSupabaseConfig,
} from "@/lib/supabase/service-server";

const PRODUCT_COLUMNS = "id, name, category, subcategory, emoji, image, description, price, stock";

export async function GET() {
  try {
    const { rows } = await query(
      `select ${PRODUCT_COLUMNS}
       from products
       order by id asc`,
    );

    return NextResponse.json({
      products: rows.map(mapProductRow),
      source: "database",
    });
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).order("id");

        if (error) {
          throw error;
        }

        return NextResponse.json({
          products: (data || []).map(mapProductRow),
          source: "supabase",
        });
      } catch (supabaseError) {
        return NextResponse.json({
          products: INITIAL_PRODUCTS,
          source: "local",
          warning:
            supabaseError.message ||
            dbError.message ||
            "Unable to fetch products from database or Supabase",
        });
      }
    }

    return NextResponse.json({
      products: INITIAL_PRODUCTS,
      source: "local",
      warning: dbError.message || "Unable to fetch products from database",
    });
  }
}

export async function POST(request) {
  const { product } = await request.json();
  const payload = mapProductPayload(product);

  try {
    const { rows } = await query(
      `insert into products (name, category, subcategory, emoji, image, description, price, stock)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning ${PRODUCT_COLUMNS}`,
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
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select(PRODUCT_COLUMNS)
          .single();

        if (error) {
          throw error;
        }

        return NextResponse.json({ product: mapProductRow(data), source: "supabase" });
      } catch (supabaseError) {
        return NextResponse.json(
          { error: supabaseError.message || dbError.message || "Unable to create product" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: dbError.message || "Unable to create product" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  const { product } = await request.json();
  const payload = mapProductPayload(product);

  try {
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
       returning ${PRODUCT_COLUMNS}`,
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
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id)
          .select(PRODUCT_COLUMNS)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ product: mapProductRow(data), source: "supabase" });
      } catch (supabaseError) {
        return NextResponse.json(
          { error: supabaseError.message || dbError.message || "Unable to update product" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: dbError.message || "Unable to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  const { id } = await request.json();

  try {
    const result = await query("delete from products where id = $1", [id]);

    if (!result.rowCount) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, source: "supabase" });
      } catch (supabaseError) {
        return NextResponse.json(
          { error: supabaseError.message || dbError.message || "Unable to delete product" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: dbError.message || "Unable to delete product" },
      { status: 500 },
    );
  }
}
