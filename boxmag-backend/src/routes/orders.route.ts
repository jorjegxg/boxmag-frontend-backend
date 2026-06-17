import { Router } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import { mysqlPool } from "../db/mysql";
import {
  getOrderAttachmentFromMinio,
  uploadOrderAttachmentToMinio,
} from "../services/minio";
import {
  getOrderOfferSenderOptions,
  isOrderEmailTransportConfigured,
  type NewOrderEmailParams,
  type OrderOfferFromKey,
  sendBusinessOrderConfirmationEmailToCustomer,
  sendNewOrderNotificationEmail,
  sendOrderOfferEmailToCustomer,
} from "../services/email";
import {
  MAX_ORDER_ATTACHMENT_BYTES,
  MAX_ORDER_ATTACHMENT_MB,
} from "../config/uploads";
import { parseCartItemsJson } from "../utils/cart-items";

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
  accountEmail?: unknown;
  attachment?: unknown;
  attachmentBase64?: unknown;
  attachmentMimeType?: unknown;
};

type AttachmentPayload = {
  fileName: string;
  contentBase64: string;
  mimeType?: string | null;
};

type UserIdRow = RowDataPacket & {
  id: number;
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function resolveUserIdForAccount(
  accountEmailRaw: unknown,
  orderEmail: string,
): Promise<number | null> {
  const accountEmail = toOptionalString(accountEmailRaw);
  if (!accountEmail) return null;

  if (normalizeEmail(accountEmail) !== normalizeEmail(orderEmail)) {
    return null;
  }

  const [rows] = await mysqlPool.execute<UserIdRow[]>(
    `SELECT id FROM users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1`,
    [normalizeEmail(accountEmail)],
  );

  const userId = rows[0]?.id;
  return typeof userId === "number" && userId > 0 ? userId : null;
}

export const ordersRouter = Router();
const ALLOWED_ORDER_STATUSES = new Set([
  "new",
  "in progress",
  "completed",
  "done",
]);

type OrderAttachmentRow = RowDataPacket & {
  id: number;
  attachment_name: string | null;
  attachment_object_name: string | null;
  attachment_url: string | null;
};

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
  ftl?: number | null;
  attachment_name: string | null;
  attachment_object_name: string | null;
  attachment_url: string | null;
  message: string | null;
  items_json: string | null;
  status: string;
  payment_status: string | null;
  total_amount_cents: number | null;
  subtotal_cents: number | null;
  vat_percent: string | number | null;
  vat_cents: number | null;
  shipping_cents: number | null;
  shipping_method: string | null;
  shipping_eta: string | null;
  offer_sent_at: string | null;
  offer_sent_from: string | null;
  currency: string | null;
  created_at: string;
  first_name: string;
  surname: string;
  company_name: string;
  vat_number?: string | null;
  email: string;
  phone: string;
  address?: string | null;
  postcode?: string | null;
  city: string;
  country: string;
  create_account?: number | null;
  consent_phone?: number | null;
  consent_email?: number | null;
};

const ALLOWED_OFFER_FROM_KEYS = new Set<OrderOfferFromKey>([
  "info",
  "b2b",
  "orders",
]);

function centsToAmount(value: number | null): number | null {
  if (value == null) return null;
  return Math.round(value) / 100;
}

function vatPercentToNumber(value: string | number | null): number | null {
  if (value == null) return null;
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num) ? num : null;
}

function parseAttachmentBase64(value: unknown): Buffer | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const base64Payload = trimmed.includes(",")
    ? trimmed.slice(trimmed.indexOf(",") + 1)
    : trimmed;
  try {
    const buffer = Buffer.from(base64Payload, "base64");
    if (buffer.length === 0) return null;
    return buffer;
  } catch {
    return null;
  }
}

function parseAttachmentPayload(value: unknown): AttachmentPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const fileName = toOptionalString(candidate.fileName);
  const contentBase64 = toOptionalString(candidate.contentBase64);
  if (!fileName || !contentBase64) return null;
  return {
    fileName,
    contentBase64,
    mimeType: toOptionalString(candidate.mimeType),
  };
}

function orderHasStoredAttachment(row: {
  attachment_object_name: string | null;
  attachment_url: string | null;
}): boolean {
  return Boolean(
    row.attachment_object_name?.trim() || row.attachment_url?.trim(),
  );
}

function guessAttachmentMimeType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimeByExtension: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    zip: "application/zip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    csv: "text/csv",
  };
  return mimeByExtension[extension] ?? "application/octet-stream";
}

function buildAttachmentContentDisposition(
  fileName: string,
  inline: boolean,
): string {
  const dispositionType = inline ? "inline" : "attachment";
  const asciiFallback =
    fileName.replace(/[^\x20-\x7E]/g, "_").trim() || "attachment";
  return `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function mapOrderRowToEmailParams(row: OrderListRow): NewOrderEmailParams {
  return {
    orderId: row.id,
    customerName:
      [row.first_name, row.surname].filter(Boolean).join(" ").trim() ||
      row.company_name ||
      "Unknown customer",
    customerEmail: row.email,
    companyName: row.company_name ?? "",
    vatNumber: row.vat_number ?? null,
    customerPhone: row.phone ?? "",
    customerAddress: row.address ?? "",
    customerPostcode: row.postcode ?? "",
    customerCity: row.city ?? "",
    customerCountry: row.country ?? "",
    createAccount: Boolean(row.create_account),
    consentPhone: Boolean(row.consent_phone),
    consentEmail: Boolean(row.consent_email),
    cardboardType: row.cardboard_type,
    cardboardColour: row.cardboard_colour,
    boxPrint: row.box_print,
    lengthMm: row.length_mm,
    widthMm: row.width_mm,
    heightMm: row.height_mm,
    sizeType: row.size_type,
    transport: row.transport,
    quantity: row.quantity,
    ftl: Boolean(row.ftl),
    attachmentName: row.attachment_name,
    attachmentObjectName: row.attachment_object_name,
    attachmentUrl: row.attachment_url,
    boxTypeName: row.box_type_name,
    message: row.message ?? "",
    items: parseCartItemsJson(row.items_json),
    priceBreakdown: buildPriceBreakdown(row),
  };
}

async function loadOrderRowById(
  orderId: number,
): Promise<OrderListRow | null> {
  const [rows] = await mysqlPool.query<OrderListRow[]>(
    `SELECT o.id, o.box_type_name, o.cardboard_type, o.cardboard_colour, o.box_print,
            o.length_mm, o.width_mm, o.height_mm, o.size_type, o.transport, o.ftl,
            o.quantity, o.attachment_name, o.attachment_object_name, o.attachment_url,
            o.message, o.items_json, o.status,
            o.payment_status, o.total_amount_cents, o.subtotal_cents,
            o.vat_percent, o.vat_cents, o.shipping_cents, o.shipping_method,
            o.shipping_eta, o.offer_sent_at, o.offer_sent_from, o.currency, o.created_at,
            c.first_name, c.surname, c.company_name, c.vat_number, c.email, c.phone,
            c.address, c.postcode, c.city, c.country,
            c.create_account, c.consent_phone, c.consent_email
     FROM orders o
     LEFT JOIN contacts c ON c.order_id = o.id
     WHERE o.id = ?
     LIMIT 1`,
    [orderId],
  );

  return rows[0] ?? null;
}

function buildPriceBreakdown(row: OrderListRow) {
  const subtotal = centsToAmount(row.subtotal_cents);
  const vatAmount = centsToAmount(row.vat_cents);
  const shipping = centsToAmount(row.shipping_cents);
  const total = centsToAmount(row.total_amount_cents);
  if (
    subtotal == null &&
    vatAmount == null &&
    shipping == null &&
    total == null
  ) {
    return null;
  }
  return {
    subtotal,
    vatPercent: vatPercentToNumber(row.vat_percent),
    vatAmount,
    shipping,
    total,
    currency: row.currency ?? null,
    shippingMethod: row.shipping_method ?? null,
    shippingEta: row.shipping_eta ?? null,
  };
}

ordersRouter.get("/", async (req, res) => {
  const emailFilter =
    typeof req.query.email === "string" && req.query.email.trim().length > 0
      ? req.query.email.trim().toLowerCase()
      : null;

  try {
    const sql = `SELECT o.id, o.box_type_name, o.cardboard_type, o.cardboard_colour, o.box_print,
              o.length_mm, o.width_mm, o.height_mm, o.size_type, o.transport,
              o.quantity, o.attachment_name, o.attachment_object_name, o.attachment_url,
              o.message, o.items_json, o.status,
              o.payment_status, o.total_amount_cents, o.subtotal_cents,
              o.vat_percent, o.vat_cents, o.shipping_cents, o.shipping_method,
              o.shipping_eta, o.currency, o.created_at,
              c.first_name, c.surname, c.company_name, c.email, c.phone, c.city, c.country
       FROM orders o
       LEFT JOIN contacts c ON c.order_id = o.id
       ${
         emailFilter
           ? `WHERE LOWER(c.email) = ?
              OR o.user_id = (SELECT id FROM users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1)`
           : ""
       }
       ORDER BY o.created_at DESC, o.id DESC`;
    const [rows] = emailFilter
      ? await mysqlPool.query<OrderListRow[]>(sql, [emailFilter, emailFilter])
      : await mysqlPool.query<OrderListRow[]>(sql);

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
        attachmentUrl: row.attachment_url,
        hasAttachment: orderHasStoredAttachment(row),
        message: row.message ?? "",
        items: parseCartItemsJson(row.items_json),
        priceBreakdown: buildPriceBreakdown(row),
        paymentStatus: row.payment_status ?? null,
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

ordersRouter.get("/offer-senders", (_req, res) => {
  res.json({
    ok: true,
    data: getOrderOfferSenderOptions(),
  });
});

ordersRouter.post("/:orderId/send-offer", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const body = (req.body ?? {}) as {
    fromKey?: unknown;
    message?: unknown;
  };
  const fromKeyRaw = toRequiredString(body.fromKey);
  const fromKey = fromKeyRaw as OrderOfferFromKey | null;
  const offerMessage = toOptionalString(body.message);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid order id",
    });
    return;
  }

  if (!fromKey || !ALLOWED_OFFER_FROM_KEYS.has(fromKey)) {
    res.status(400).json({
      ok: false,
      message: "Invalid sender address",
    });
    return;
  }

  if (!isOrderEmailTransportConfigured()) {
    res.status(503).json({
      ok: false,
      message: "Email transport is not configured",
    });
    return;
  }

  const senderOptions = getOrderOfferSenderOptions();
  if (!senderOptions.some((option) => option.key === fromKey)) {
    res.status(400).json({
      ok: false,
      message: "Selected sender address is not configured",
    });
    return;
  }

  try {
    const row = await loadOrderRowById(orderId);
    if (!row) {
      res.status(404).json({
        ok: false,
        message: "Order not found",
      });
      return;
    }

    const customerEmail = row.email?.trim();
    if (!customerEmail) {
      res.status(400).json({
        ok: false,
        message: "Order has no customer email",
      });
      return;
    }

    await sendOrderOfferEmailToCustomer({
      ...mapOrderRowToEmailParams(row),
      fromKey,
      offerMessage,
    });

    const selectedSender = senderOptions.find((option) => option.key === fromKey);
    const offerSentFrom = selectedSender?.email ?? null;
    await mysqlPool.execute(
      `UPDATE orders
       SET offer_sent_at = CURRENT_TIMESTAMP, offer_sent_from = ?
       WHERE id = ?`,
      [offerSentFrom, orderId],
    );

    const [updatedRows] = await mysqlPool.query<
      RowDataPacket & { offer_sent_at: string | null; offer_sent_from: string | null }
    >(
      `SELECT offer_sent_at, offer_sent_from FROM orders WHERE id = ? LIMIT 1`,
      [orderId],
    );
    const offerSentAt = updatedRows[0]?.offer_sent_at ?? null;

    res.json({
      ok: true,
      data: {
        orderId,
        to: customerEmail,
        from: offerSentFrom,
        offerSentAt,
        offerSentFrom: updatedRows[0]?.offer_sent_from ?? offerSentFrom,
      },
    });
  } catch (error) {
    console.error("Failed to send order offer email", error);
    res.status(500).json({
      ok: false,
      message: "Failed to send offer email",
    });
  }
});

ordersRouter.get("/:orderId/attachment", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const emailFilter =
    typeof req.query.email === "string" && req.query.email.trim().length > 0
      ? req.query.email.trim().toLowerCase()
      : null;
  const forceDownload =
    req.query.download === "1" || req.query.download === "true";

  if (!Number.isInteger(orderId) || orderId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid order id",
    });
    return;
  }

  try {
    const sql = `SELECT o.id, o.attachment_name, o.attachment_object_name, o.attachment_url
       FROM orders o
       LEFT JOIN contacts c ON c.order_id = o.id
       WHERE o.id = ?
       ${
         emailFilter
           ? `AND (
                LOWER(c.email) = ?
                OR o.user_id = (SELECT id FROM users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1)
              )`
           : ""
       }
       LIMIT 1`;
    const [rows] = emailFilter
      ? await mysqlPool.query<OrderAttachmentRow[]>(sql, [
          orderId,
          emailFilter,
          emailFilter,
        ])
      : await mysqlPool.query<OrderAttachmentRow[]>(sql, [orderId]);

    if (rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "Order not found",
      });
      return;
    }

    const row = rows[0]!;
    if (!orderHasStoredAttachment(row)) {
      res.status(404).json({
        ok: false,
        message: "Order attachment not found",
      });
      return;
    }

    const fileName = row.attachment_name?.trim() || "attachment";
    let buffer: Buffer;
    let contentType: string | null = null;

    if (row.attachment_object_name?.trim()) {
      const attachment = await getOrderAttachmentFromMinio(
        row.attachment_object_name.trim(),
      );
      buffer = attachment.buffer;
      contentType = attachment.contentType;
    } else if (row.attachment_url?.trim()) {
      const attachmentResponse = await fetch(row.attachment_url.trim());
      if (!attachmentResponse.ok) {
        res.status(502).json({
          ok: false,
          message: "Failed to load order attachment",
        });
        return;
      }
      const arrayBuffer = await attachmentResponse.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = attachmentResponse.headers.get("content-type");
    } else {
      res.status(404).json({
        ok: false,
        message: "Order attachment not found",
      });
      return;
    }

    res.setHeader(
      "Content-Type",
      contentType?.trim() || guessAttachmentMimeType(fileName),
    );
    res.setHeader(
      "Content-Disposition",
      buildAttachmentContentDisposition(fileName, !forceDownload),
    );
    res.send(buffer);
  } catch (error) {
    console.error("Failed to load order attachment", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load order attachment",
    });
  }
});

ordersRouter.get("/:orderId", async (req, res) => {
  const orderId = Number(req.params.orderId);
  const emailFilter =
    typeof req.query.email === "string" && req.query.email.trim().length > 0
      ? req.query.email.trim().toLowerCase()
      : null;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    res.status(400).json({
      ok: false,
      message: "Invalid order id",
    });
    return;
  }

  try {
    const sql = `SELECT o.id, o.box_type_name, o.cardboard_type, o.cardboard_colour, o.box_print,
              o.length_mm, o.width_mm, o.height_mm, o.size_type, o.transport,
              o.quantity, o.attachment_name, o.attachment_object_name, o.attachment_url,
              o.message, o.items_json, o.status,
              o.payment_status, o.total_amount_cents, o.subtotal_cents,
              o.vat_percent, o.vat_cents, o.shipping_cents, o.shipping_method,
              o.shipping_eta, o.offer_sent_at, o.offer_sent_from, o.currency, o.created_at,
              c.first_name, c.surname, c.company_name, c.email, c.phone, c.city, c.country
       FROM orders o
       LEFT JOIN contacts c ON c.order_id = o.id
       WHERE o.id = ?
       ${
         emailFilter
           ? `AND (
                LOWER(c.email) = ?
                OR o.user_id = (SELECT id FROM users WHERE LOWER(email) = ? AND is_active = 1 LIMIT 1)
              )`
           : ""
       }
       LIMIT 1`;
    const [rows] = emailFilter
      ? await mysqlPool.query<OrderListRow[]>(sql, [
          orderId,
          emailFilter,
          emailFilter,
        ])
      : await mysqlPool.query<OrderListRow[]>(sql, [orderId]);

    if (rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "Order not found",
      });
      return;
    }

    const row = rows[0]!;
    res.json({
      ok: true,
      data: {
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
        attachmentUrl: row.attachment_url,
        hasAttachment: orderHasStoredAttachment(row),
        message: row.message ?? "",
        items: parseCartItemsJson(row.items_json),
        priceBreakdown: buildPriceBreakdown(row),
        paymentStatus: row.payment_status ?? null,
        status: row.status,
        email: row.email,
        phone: row.phone,
        city: row.city,
        country: row.country,
        createdAt: row.created_at,
        offerSentAt: row.offer_sent_at ?? null,
        offerSentFrom: row.offer_sent_from ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to load order details", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load order details",
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
  const attachmentPayload = parseAttachmentPayload(payload.attachment);
  const attachmentBuffer =
    parseAttachmentBase64(payload.attachmentBase64) ??
    parseAttachmentBase64(attachmentPayload?.contentBase64);
  const attachmentMimeType =
    toOptionalString(payload.attachmentMimeType) ??
    toOptionalString(attachmentPayload?.mimeType ?? null);
  const effectiveAttachmentName = attachmentName ?? attachmentPayload?.fileName ?? null;
  let attachmentObjectName: string | null = null;
  let attachmentUrl: string | null = null;
  if (attachmentBuffer && attachmentBuffer.length > MAX_ORDER_ATTACHMENT_BYTES) {
    res.status(400).json({
      ok: false,
      message: `Attachment is too large. Maximum allowed size is ${MAX_ORDER_ATTACHMENT_MB} MB.`,
    });
    return;
  }
  if (effectiveAttachmentName && attachmentBuffer) {
    try {
      const uploaded = await uploadOrderAttachmentToMinio({
        fileBuffer: attachmentBuffer,
        originalFileName: effectiveAttachmentName,
        ...(attachmentMimeType ? { mimeType: attachmentMimeType } : {}),
      });
      attachmentObjectName = uploaded.objectName;
      attachmentUrl = uploaded.url;
    } catch (uploadError) {
      console.error("Failed to upload order attachment to MinIO", uploadError);
      res.status(502).json({
        ok: false,
        message: "Failed to upload attachment",
      });
      return;
    }
  }
  const ftl = payload.ftl === true;
  const createAccount = payload.createAccount === true;
  const consentPhone = payload.consentPhone === true;
  const consentEmail = payload.consentEmail === true;
  const userId = await resolveUserIdForAccount(payload.accountEmail, email);

  let connection: PoolConnection | undefined;
  try {
    connection = await mysqlPool.getConnection();
    const conn = connection;
    await conn.beginTransaction();

    const [orderInsertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO orders
        (user_id, box_type_id, box_type_name, cardboard_type, cardboard_colour, box_print,
         length_mm, width_mm, height_mm, size_type, transport, quantity, ftl, attachment_name,
         attachment_object_name, attachment_url, message, accepted_terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
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
        effectiveAttachmentName,
        attachmentObjectName,
        attachmentUrl,
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

    if (isOrderEmailTransportConfigured()) {
      try {
        const customerName = `${firstName} ${surname}`.trim();
        await sendNewOrderNotificationEmail({
          orderId,
          customerName,
          customerEmail: email,
          companyName,
          vatNumber,
          customerPhone: phone,
          customerAddress: address,
          customerPostcode: postcode,
          customerCity: city,
          customerCountry: country,
          createAccount,
          consentPhone,
          consentEmail,
          cardboardType,
          cardboardColour,
          boxPrint,
          lengthMm,
          widthMm,
          heightMm,
          sizeType,
          transport,
          quantity,
          ftl,
          attachmentName: effectiveAttachmentName,
          attachmentObjectName,
          attachmentUrl,
          boxTypeName,
          message,
          items: null,
          priceBreakdown: null,
        });
        await sendBusinessOrderConfirmationEmailToCustomer({
          orderId,
          customerName,
          customerEmail: email,
          companyName,
          vatNumber,
          customerPhone: phone,
          customerAddress: address,
          customerPostcode: postcode,
          customerCity: city,
          customerCountry: country,
          createAccount,
          consentPhone,
          consentEmail,
          cardboardType,
          cardboardColour,
          boxPrint,
          lengthMm,
          widthMm,
          heightMm,
          sizeType,
          transport,
          quantity,
          ftl,
          attachmentName: effectiveAttachmentName,
          attachmentObjectName,
          attachmentUrl,
          boxTypeName,
          message,
          items: null,
          priceBreakdown: null,
        });
      } catch (emailError) {
        console.error("Order created, but failed to send confirmation emails", emailError);
      }
    } else {
      console.warn(
        "Order created but SMTP is not configured; internal order notification email skipped",
      );
    }

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
