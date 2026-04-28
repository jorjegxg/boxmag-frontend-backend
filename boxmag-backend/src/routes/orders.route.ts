import { Router } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import { mysqlPool } from "../db/mysql";

type CreateOrderPayload = {
  boxTypeId?: unknown;
  boxTypeName?: unknown;
  cardboardType?: unknown;
  cardboardColour?: unknown;
  boxPrint?: unknown;
  lengthMm?: unknown;
  widthMm?: unknown;
  heightMm?: unknown;
  sizeType?: unknown;
  transport?: unknown;
  quantity?: unknown;
  ftl?: unknown;
  attachmentName?: unknown;
  message?: unknown;
  acceptedTerms?: unknown;
  firstName?: unknown;
  surname?: unknown;
  companyName?: unknown;
  vatNumber?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  postcode?: unknown;
  city?: unknown;
  country?: unknown;
  createAccount?: unknown;
  consentPhone?: unknown;
  consentEmail?: unknown;
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

function toRequiredNumber(value: unknown): number | null {
  const parsed = toOptionalNumber(value);
  return parsed != null ? parsed : null;
}

export const ordersRouter = Router();
const ALLOWED_ORDER_STATUSES = new Set([
  "new",
  "in progress",
  "completed",
  "done",
]);

type OrderListRow = RowDataPacket & {
  id: number;
  box_type_name: string;
  cardboard_type: string;
  cardboard_colour: string;
  box_print: string;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  size_type: string;
  transport: string;
  quantity: number;
  attachment_name: string | null;
  message: string | null;
  status: string;
  created_at: string;
  first_name: string;
  surname: string;
  company_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
};

ordersRouter.get("/", async (_req, res) => {
  try {
    const [rows] = await mysqlPool.query<OrderListRow[]>(
      `SELECT o.id, o.box_type_name, o.cardboard_type, o.cardboard_colour, o.box_print,
              o.length_mm, o.width_mm, o.height_mm, o.size_type, o.transport,
              o.quantity, o.attachment_name, o.message, o.status, o.created_at,
              c.first_name, c.surname, c.company_name, c.email, c.phone, c.city, c.country
       FROM orders o
       LEFT JOIN contacts c ON c.order_id = o.id
       ORDER BY o.created_at DESC, o.id DESC`
    );

    res.json({
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        orderNumber: `ORD-${String(row.id).padStart(4, "0")}`,
        customerName:
          [row.first_name, row.surname].filter(Boolean).join(" ").trim() ||
          row.company_name ||
          "Unknown customer",
        companyName: row.company_name,
        boxTypeName: row.box_type_name,
        cardboardType: row.cardboard_type,
        cardboardColour: row.cardboard_colour,
        boxPrint: row.box_print,
        size:
          row.length_mm != null && row.width_mm != null && row.height_mm != null
            ? `${row.length_mm} x ${row.width_mm} x ${row.height_mm} mm (${row.size_type})`
            : `N/A (${row.size_type})`,
        transport: row.transport,
        quantity: row.quantity,
        attachmentName: row.attachment_name,
        message: row.message ?? "",
        status: row.status,
        email: row.email,
        phone: row.phone,
        city: row.city,
        country: row.country,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Failed to load orders", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load orders",
    });
  }
});

ordersRouter.post("/", async (req, res) => {
  const payload = (req.body ?? {}) as CreateOrderPayload;

  const boxTypeName = toRequiredString(payload.boxTypeName);
  const cardboardType = toRequiredString(payload.cardboardType);
  const cardboardColour = toRequiredString(payload.cardboardColour);
  const boxPrint = toRequiredString(payload.boxPrint);
  const sizeType = toRequiredString(payload.sizeType);
  const transport = toRequiredString(payload.transport);
  const quantity = toRequiredNumber(payload.quantity);
  const message = toRequiredString(payload.message);
  const firstName = toRequiredString(payload.firstName);
  const surname = toRequiredString(payload.surname);
  const companyName = toRequiredString(payload.companyName);
  const email = toRequiredString(payload.email);
  const phone = toRequiredString(payload.phone);
  const address = toRequiredString(payload.address);
  const postcode = toRequiredString(payload.postcode);
  const city = toRequiredString(payload.city);
  const country = toRequiredString(payload.country);

  if (
    !boxTypeName ||
    !cardboardType ||
    !cardboardColour ||
    !boxPrint ||
    !sizeType ||
    !transport ||
    quantity == null ||
    !message ||
    payload.acceptedTerms !== true ||
    !firstName ||
    !surname ||
    !companyName ||
    !email ||
    !phone ||
    !address ||
    !postcode ||
    !city ||
    !country
  ) {
    res.status(400).json({
      ok: false,
      message: "Invalid order payload",
    });
    return;
  }

  const lengthMm = toOptionalNumber(payload.lengthMm);
  const widthMm = toOptionalNumber(payload.widthMm);
  const heightMm = toOptionalNumber(payload.heightMm);
  const boxTypeId = toOptionalNumber(payload.boxTypeId);
  const vatNumber = toOptionalString(payload.vatNumber);
  const attachmentName = toOptionalString(payload.attachmentName);
  const ftl = payload.ftl === true;
  const createAccount = payload.createAccount === true;
  const consentPhone = payload.consentPhone === true;
  const consentEmail = payload.consentEmail === true;

  let connection: PoolConnection | undefined;
  try {
    connection = await mysqlPool.getConnection();
    const conn = connection;
    await conn.beginTransaction();

    const [orderInsertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO orders
        (box_type_id, box_type_name, cardboard_type, cardboard_colour, box_print,
         length_mm, width_mm, height_mm, size_type, transport, quantity, ftl, attachment_name, message, accepted_terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        boxTypeId,
        boxTypeName,
        cardboardType,
        cardboardColour,
        boxPrint,
        lengthMm,
        widthMm,
        heightMm,
        sizeType,
        transport,
        quantity,
        ftl ? 1 : 0,
        attachmentName,
        message,
        1,
      ]
    );

    const orderId = orderInsertResult.insertId;

    await conn.execute(
      `INSERT INTO contacts
        (order_id, first_name, surname, company_name, vat_number, email, phone, address, postcode, city, country,
         create_account, consent_phone, consent_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        firstName,
        surname,
        companyName,
        vatNumber,
        email,
        phone,
        address,
        postcode,
        city,
        country,
        createAccount ? 1 : 0,
        consentPhone ? 1 : 0,
        consentEmail ? 1 : 0,
      ]
    );

    await conn.commit();

    res.status(201).json({
      ok: true,
      data: {
        id: orderId,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Failed to create order", error);
    res.status(500).json({
      ok: false,
      message: "Failed to create order",
    });
  } finally {
    connection?.release();
  }
});

ordersRouter.patch("/:orderId/status", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const nextStatusRaw = toRequiredString((req.body ?? {}).status);
  const nextStatus = nextStatusRaw?.toLowerCase() ?? null;

  if (!Number.isInteger(orderId) || orderId <= 0 || !nextStatus) {
    res.status(400).json({
      ok: false,
      message: "Invalid order status payload",
    });
    return;
  }

  if (!ALLOWED_ORDER_STATUSES.has(nextStatus)) {
    res.status(400).json({
      ok: false,
      message: "Invalid order status value",
    });
    return;
  }

  try {
    const [result] = await mysqlPool.execute<ResultSetHeader>(
      `UPDATE orders SET status = ? WHERE id = ?`,
      [nextStatus, orderId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        ok: false,
        message: "Order not found",
      });
      return;
    }

    res.json({
      ok: true,
      data: {
        id: orderId,
        status: nextStatus,
      },
    });
  } catch (error) {
    console.error("Failed to update order status", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update order status",
    });
  }
});
