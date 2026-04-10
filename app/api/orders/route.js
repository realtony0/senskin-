import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { mapOrderPayload, mapOrderRow } from "@/lib/supabase/mappers";

const ORDER_COLUMNS =
  "id, order_code, order_date, customer_name, customer_phone, customer_address, shipping_zone, payment_method, items, shipping_fee, total, status";

export async function GET(request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { rows } = await query(
      `select ${ORDER_COLUMNS}
       from orders
       order by created_at desc`,
    );

    return NextResponse.json({ orders: rows.map(mapOrderRow), source: "database" });
  } catch {
    return NextResponse.json({ orders: [], source: "local" });
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
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to create order" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

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
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update order" },
      { status: 500 },
    );
  }
}
