import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { mapOrderPayload, mapOrderRow } from "@/lib/supabase/mappers";
import {
  createPublicSupabaseClient,
  hasPublicSupabaseConfig,
} from "@/lib/supabase/public-server";
import {
  createServiceSupabaseClient,
  hasServiceSupabaseConfig,
} from "@/lib/supabase/service-server";

const ORDER_COLUMNS =
  "id, order_code, order_date, customer_name, customer_phone, customer_address, shipping_zone, payment_method, items, shipping_fee, total, status";

export async function GET() {
  try {
    const { rows } = await query(
      `select ${ORDER_COLUMNS}
       from orders
       order by created_at desc`,
    );

    return NextResponse.json({ orders: rows.map(mapOrderRow), source: "database" });
  } catch (error) {
    if (hasServiceSupabaseConfig()) {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error: supabaseError } = await supabase
          .from("orders")
          .select(ORDER_COLUMNS)
          .order("created_at", { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        return NextResponse.json({
          orders: (data || []).map(mapOrderRow),
          source: "supabase",
        });
      } catch (fallbackError) {
        return NextResponse.json(
          {
            error:
              fallbackError.message ||
              error.message ||
              "Unable to fetch orders from database or Supabase.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          "Unable to fetch orders. A working DATABASE_URL or pooled connection is required.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const { order } = await request.json();
  const payload = mapOrderPayload(order);

  try {
    const { rows } = await query(
      `insert into orders (
          order_code, order_date, customer_name, customer_phone, customer_address,
          shipping_zone, payment_method, items, shipping_fee, total, status
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
       returning ${ORDER_COLUMNS}`,
      [
        payload.order_code,
        payload.order_date,
        payload.customer_name,
        payload.customer_phone,
        payload.customer_address,
        payload.shipping_zone,
        payload.payment_method,
        JSON.stringify(payload.items),
        payload.shipping_fee,
        payload.total,
        payload.status,
      ],
    );

    return NextResponse.json({ order: mapOrderRow(rows[0]), source: "database" });
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("orders")
          .insert(payload)
          .select(ORDER_COLUMNS)
          .single();

        if (error) {
          throw error;
        }

        return NextResponse.json({ order: mapOrderRow(data), source: "supabase" });
      } catch (supabaseError) {
        return NextResponse.json(
          {
            error:
              supabaseError.message ||
              dbError.message ||
              "Unable to create order in database or Supabase",
          },
          { status: 500 },
        );
      }
    }

    if (hasPublicSupabaseConfig()) {
      try {
        const supabase = createPublicSupabaseClient();
        const { error } = await supabase.from("orders").insert(payload);

        if (error) {
          throw error;
        }

        return NextResponse.json({ order, source: "supabase" });
      } catch (supabaseError) {
        return NextResponse.json(
          {
            error:
              supabaseError.message ||
              dbError.message ||
              "Unable to create order in database or Supabase",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: dbError.message || "Unable to create order in database" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  const { id, status } = await request.json();

  try {
    const { rows } = await query(
      `update orders
       set status = $1
       where order_code = $2
       returning ${ORDER_COLUMNS}`,
      [status, id],
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order: mapOrderRow(rows[0]) });
  } catch (dbError) {
    if (hasServiceSupabaseConfig()) {
      try {
        const supabase = createServiceSupabaseClient();
        const { data, error } = await supabase
          .from("orders")
          .update({ status })
          .eq("order_code", id)
          .select(ORDER_COLUMNS)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ order: mapOrderRow(data), source: "supabase" });
      } catch (supabaseError) {
        return NextResponse.json(
          {
            error:
              supabaseError.message ||
              dbError.message ||
              "Unable to update order in database or Supabase.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Unable to update order. A working DATABASE_URL or pooled connection is required.",
      },
      { status: 500 },
    );
  }
}
