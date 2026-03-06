import { normalizeProduct } from "@/lib/catalog-taxonomy";

export function mapProductRow(row) {
  return normalizeProduct({
    id: Number(row.id),
    n: row.name,
    c: row.category,
    sc: row.subcategory || "",
    e: row.emoji || "",
    i: row.image || "",
    d: row.description || "",
    p: Number(row.price || 0),
    s: Number(row.stock || 0),
  });
}

export function mapProductPayload(product) {
  const normalizedProduct = normalizeProduct(product);

  return {
    name: normalizedProduct.n.trim(),
    category: normalizedProduct.c,
    subcategory: normalizedProduct.sc,
    emoji: normalizedProduct.e || "",
    image: normalizedProduct.i || "",
    description: normalizedProduct.d || "",
    price: Number(normalizedProduct.p || 0),
    stock: Number(normalizedProduct.s || 0),
  };
}

export function mapOrderPayload(order) {
  return {
    order_code: order.id,
    order_date: order.date,
    customer_name: order.nom,
    customer_phone: order.tel,
    customer_address: order.addr,
    shipping_zone: order.zone,
    payment_method: order.pm,
    items: order.items,
    shipping_fee: Number(order.livr || 0),
    total: Number(order.total || 0),
    status: order.status || "new",
  };
}

export function mapOrderRow(row) {
  return {
    id: row.order_code,
    dbId: row.id,
    date: row.order_date,
    nom: row.customer_name,
    tel: row.customer_phone,
    addr: row.customer_address,
    zone: row.shipping_zone,
    pm: row.payment_method,
    items: Array.isArray(row.items) ? row.items : [],
    livr: Number(row.shipping_fee || 0),
    total: Number(row.total || 0),
    status: row.status || "new",
  };
}
