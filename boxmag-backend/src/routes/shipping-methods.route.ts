import { Router } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";
import { requireAdmin } from "../middleware/require-admin";

type ShippingMethodRow = RowDataPacket & {
  id: number;
  method_key: string;
  name: string;
  eta_text: string;
  price: number;
  is_active: number;
  sort_order: number;
};

type CreateShippingMethodPayload = {
  key?: unknown;
  name?: unknown;
  etaText?: unknown;
  price?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
};

type UpdateShippingMethodPayload = {
  key?: unknown;
  name?: unknown;
  etaText?: unknown;
  price?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
};

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRequiredString(value: unknown): string | null {
  const normalized = toOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : null;
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export const shippingMethodsRouter = Router();

shippingMethodsRouter.get(
  "/",
  (req, res, next) => {
    if (req.query.includeInactive === "true") {
      requireAdmin(req, res, next);
      return;
    }
    next();
  },
  async (req, res) => {
    const includeInactive = req.query.includeInactive === "true";

    try {
      const [rows] = await mysqlPool.query<ShippingMethodRow[]>(
        `SELECT id, method_key, name, eta_text, price, is_active, sort_order
       FROM shipping_methods
       ${includeInactive ? "" : "WHERE is_active = 1"}
       ORDER BY sort_order ASC, id ASC`
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"
      );
      res.json({
        ok: true,
        data: rows.map((row) => ({
          id: row.id,
          key: row.method_key,
          name: row.name,
          etaText: row.eta_text,
          price: Number(row.price),
          isActive: Boolean(row.is_active),
          sortOrder: row.sort_order,
        })),
      });
    } catch (error) {
      console.error("Failed to load shipping methods", error);
      res.status(500).json({
        ok: false,
        message: "Failed to load shipping methods",
      });
    }
  },
);

shippingMethodsRouter.post("/", requireAdmin, async (req, res) => {
  const payload = (req.body ?? {}) as CreateShippingMethodPayload;
  const key = toRequiredString(payload.key)?.toLowerCase() ?? null;
  const name = toRequiredString(payload.name);
  const etaText = toRequiredString(payload.etaText);
  const price = toOptionalNumber(payload.price);
  const isActive = payload.isActive !== false;
  const sortOrder = toOptionalNumber(payload.sortOrder) ?? 0;

  if (!key || !name || !etaText || price == null || price < 0 || sortOrder < 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid shipping method payload",
    });
    return;
  }

  try {
    const [result] = await mysqlPool.execute<ResultSetHeader>(
      `INSERT INTO shipping_methods
        (method_key, name, eta_text, price, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [key, name, etaText, price, isActive ? 1 : 0, sortOrder]
    );

    res.status(201).json({
      ok: true,
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    console.error("Failed to create shipping method", error);
    res.status(500).json({
      ok: false,
      message: "Failed to create shipping method",
    });
  }
});

shippingMethodsRouter.put("/:shippingMethodId", requireAdmin, async (req, res) => {
  const shippingMethodId = Number(req.params.shippingMethodId);
  const payload = (req.body ?? {}) as UpdateShippingMethodPayload;
  const key = toRequiredString(payload.key)?.toLowerCase() ?? null;
  const name = toRequiredString(payload.name);
  const etaText = toRequiredString(payload.etaText);
  const price = toOptionalNumber(payload.price);
  const isActive = payload.isActive !== false;
  const sortOrder = toOptionalNumber(payload.sortOrder) ?? 0;

  if (
    !Number.isInteger(shippingMethodId) ||
    shippingMethodId <= 0 ||
    !key ||
    !name ||
    !etaText ||
    price == null ||
    price < 0 ||
    sortOrder < 0
  ) {
    res.status(400).json({
      ok: false,
      message: "Invalid update shipping method payload",
    });
    return;
  }

  try {
    const [result] = await mysqlPool.execute<ResultSetHeader>(
      `UPDATE shipping_methods
       SET method_key = ?, name = ?, eta_text = ?, price = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [key, name, etaText, price, isActive ? 1 : 0, sortOrder, shippingMethodId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        ok: false,
        message: "Shipping method not found",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      data: {
        id: shippingMethodId,
      },
    });
  } catch (error) {
    console.error("Failed to update shipping method", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update shipping method",
    });
  }
});

shippingMethodsRouter.delete("/:shippingMethodId", requireAdmin, async (req, res) => {
  const shippingMethodId = Number(req.params.shippingMethodId);
  if (!Number.isInteger(shippingMethodId) || shippingMethodId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid shipping method id",
    });
    return;
  }

  try {
    const [result] = await mysqlPool.execute<ResultSetHeader>(
      `DELETE FROM shipping_methods WHERE id = ?`,
      [shippingMethodId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        ok: false,
        message: "Shipping method not found",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      data: {
        id: shippingMethodId,
      },
    });
  } catch (error) {
    console.error("Failed to delete shipping method", error);
    res.status(500).json({
      ok: false,
      message: "Failed to delete shipping method",
    });
  }
});
