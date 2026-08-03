import { RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";

type ProductPriceRow = RowDataPacket & {
  item_no: string;
  product_name: string;
  price_name: string;
  price_without_tax: string | number;
};

type ShippingMethodRow = RowDataPacket & {
  id: number;
  method_key: string;
  name: string;
  eta_text: string;
  price: string | number;
};

export type ResolvedCartItem = {
  itemNo: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
};

export type ResolvedShipping = {
  key: string;
  name: string;
  etaText: string;
  price: number;
};

/** Shop checkout uses the "300" tier for all qty ≥ min order (matches frontend). */
const CHECKOUT_PRICE_TIER = "300";

function toMoney(value: string | number): number {
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num) ? +num.toFixed(2) : NaN;
}

/**
 * Overwrite client unit prices/names with catalog values from DB.
 * Uses the "300" tier without-tax price for each item_no.
 */
export async function resolveCheckoutCartItems(
  items: Array<{
    itemNo: string;
    quantity: number;
    imageUrl?: string;
  }>,
): Promise<
  { ok: true; items: ResolvedCartItem[] } | { ok: false; message: string }
> {
  const itemNos = [...new Set(items.map((item) => item.itemNo))];
  if (itemNos.length === 0) {
    return { ok: false, message: "Cart is empty." };
  }

  const placeholders = itemNos.map(() => "?").join(", ");
  const [rows] = await mysqlPool.query<ProductPriceRow[]>(
    `SELECT btp.item_no, btp.product_name, p.price_name, p.price_without_tax
     FROM box_type_products btp
     INNER JOIN box_type_product_prices p ON p.box_type_product_id = btp.id
     WHERE btp.item_no IN (${placeholders})`,
    itemNos,
  );

  const tierByItemNo = new Map<string, { name: string; unitPrice: number }>();
  for (const row of rows) {
    if (row.price_name.trim() !== CHECKOUT_PRICE_TIER) continue;
    const unitPrice = toMoney(row.price_without_tax);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    if (!tierByItemNo.has(row.item_no)) {
      tierByItemNo.set(row.item_no, {
        name: row.product_name,
        unitPrice,
      });
    }
  }

  const resolved: ResolvedCartItem[] = [];
  for (const item of items) {
    const catalog = tierByItemNo.get(item.itemNo);
    if (!catalog) {
      return {
        ok: false,
        message: `Unknown or unpriced product: ${item.itemNo}.`,
      };
    }
    resolved.push({
      itemNo: item.itemNo,
      name: catalog.name,
      unitPrice: catalog.unitPrice,
      quantity: item.quantity,
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    });
  }

  return { ok: true, items: resolved };
}

/**
 * Resolve shipping from an active shipping_methods.method_key.
 * Ignores client-supplied price/name.
 */
export async function resolveShippingMethod(
  methodKey: string,
): Promise<
  { ok: true; shipping: ResolvedShipping } | { ok: false; message: string }
> {
  const key = methodKey.trim();
  if (!key) {
    return { ok: false, message: "Missing shipping method key." };
  }

  const [rows] = await mysqlPool.query<ShippingMethodRow[]>(
    `SELECT id, method_key, name, eta_text, price
     FROM shipping_methods
     WHERE method_key = ? AND is_active = 1
     LIMIT 1`,
    [key],
  );

  const row = rows[0];
  if (!row) {
    return {
      ok: false,
      message: `Unknown or inactive shipping method: ${key}.`,
    };
  }

  const price = toMoney(row.price);
  if (!Number.isFinite(price) || price < 0) {
    return {
      ok: false,
      message: `Invalid shipping price configured for: ${key}.`,
    };
  }

  return {
    ok: true,
    shipping: {
      key: row.method_key,
      name: row.name,
      etaText: row.eta_text ?? "",
      price,
    },
  };
}
