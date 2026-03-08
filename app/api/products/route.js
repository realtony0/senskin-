import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { INITIAL_PRODUCTS } from "@/lib/catalog-data";
import { mapProductPayload, mapProductRow } from "@/lib/supabase/mappers";
import {
  createServiceSupabaseClient,
  hasServiceSupabaseConfig,
} from "@/lib/supabase/service-server";

const PRODUCT_SCHEMA_VARIANTS = [
  { imageColumn: "image", hasSubcategory: true },
  { imageColumn: "images", hasSubcategory: true },
  { imageColumn: "image", hasSubcategory: false },
  { imageColumn: "images", hasSubcategory: false },
];

function getProductSelectColumns(variant) {
  return [
    "id",
    "name",
    "category",
    variant.hasSubcategory ? "subcategory" : null,
    "emoji",
    variant.imageColumn,
    "description",
    "price",
    "stock",
  ]
    .filter(Boolean)
    .join(", ");
}

function getProductMutationColumns(variant) {
  return [
    "name",
    "category",
    variant.hasSubcategory ? "subcategory" : null,
    "emoji",
    variant.imageColumn,
    "description",
    "price",
    "stock",
  ].filter(Boolean);
}

function getProductMutationValues(variant, payload) {
  return [
    payload.name,
    payload.category,
    ...(variant.hasSubcategory ? [payload.subcategory] : []),
    payload.emoji,
    payload.image,
    payload.description,
    payload.price,
    payload.stock,
  ];
}

function getSupabaseProductPayload(variant, payload) {
  return {
    name: payload.name,
    category: payload.category,
    ...(variant.hasSubcategory ? { subcategory: payload.subcategory } : {}),
    emoji: payload.emoji,
    [variant.imageColumn]: payload.image,
    description: payload.description,
    price: payload.price,
    stock: payload.stock,
  };
}

function isSchemaMismatchError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();

  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("column") && message.includes("does not exist") ||
    message.includes("could not find") && message.includes("column")
  );
}

async function runWithProductSchemaVariants(runVariant) {
  let lastError;

  for (const variant of PRODUCT_SCHEMA_VARIANTS) {
    try {
      return await runVariant(variant);
    } catch (error) {
      lastError = error;

      if (!isSchemaMismatchError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function getProductsFromDatabase() {
  const result = await runWithProductSchemaVariants((variant) =>
    query(
      `select ${getProductSelectColumns(variant)}
       from products
       order by id asc`,
    ),
  );

  return result.rows.map(mapProductRow);
}

async function getProductsFromSupabase() {
  const supabase = createServiceSupabaseClient();
  const result = await runWithProductSchemaVariants(async (variant) => {
    const { data, error } = await supabase
      .from("products")
      .select(getProductSelectColumns(variant))
      .order("id");

    if (error) {
      throw error;
    }

    return data || [];
  });

  return result.map(mapProductRow);
}

async function createProductInDatabase(payload) {
  const result = await runWithProductSchemaVariants((variant) => {
    const columns = getProductMutationColumns(variant);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

    return query(
      `insert into products (${columns.join(", ")})
       values (${placeholders})
       returning ${getProductSelectColumns(variant)}`,
      getProductMutationValues(variant, payload),
    );
  });

  return mapProductRow(result.rows[0]);
}

async function createProductInSupabase(payload) {
  const supabase = createServiceSupabaseClient();
  const result = await runWithProductSchemaVariants(async (variant) => {
    const { data, error } = await supabase
      .from("products")
      .insert(getSupabaseProductPayload(variant, payload))
      .select(getProductSelectColumns(variant))
      .single();

    if (error) {
      throw error;
    }

    return data;
  });

  return mapProductRow(result);
}

async function updateProductInDatabase(id, payload) {
  const result = await runWithProductSchemaVariants((variant) => {
    const columns = getProductMutationColumns(variant);
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");

    return query(
      `update products
       set ${assignments}
       where id = $${columns.length + 1}
       returning ${getProductSelectColumns(variant)}`,
      [...getProductMutationValues(variant, payload), id],
    );
  });

  return result.rows[0] ? mapProductRow(result.rows[0]) : null;
}

async function updateProductInSupabase(id, payload) {
  const supabase = createServiceSupabaseClient();
  const result = await runWithProductSchemaVariants(async (variant) => {
    const { data, error } = await supabase
      .from("products")
      .update(getSupabaseProductPayload(variant, payload))
      .eq("id", id)
      .select(getProductSelectColumns(variant))
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  });

  return result ? mapProductRow(result) : null;
}

export async function GET() {
  try {
    return NextResponse.json({
      products: await getProductsFromDatabase(),
      source: "database",
    });
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        return NextResponse.json({
          products: await getProductsFromSupabase(),
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
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { product } = await request.json();
  const payload = mapProductPayload(product);

  try {
    return NextResponse.json({ product: await createProductInDatabase(payload) });
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        return NextResponse.json({
          product: await createProductInSupabase(payload),
          source: "supabase",
        });
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
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { product } = await request.json();
  const payload = mapProductPayload(product);

  try {
    const updatedProduct = await updateProductInDatabase(product.id, payload);

    if (!updatedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: updatedProduct });
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        const updatedProduct = await updateProductInSupabase(product.id, payload);

        if (!updatedProduct) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ product: updatedProduct, source: "supabase" });
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
