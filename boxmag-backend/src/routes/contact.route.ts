import { Router } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";
import { requireAdmin } from "../middleware/require-admin";
import {
  getOrderOfferSenderOptions,
  isEmailTransportConfigured,
  resolveDefaultOrderOfferFromKey,
  sendContactReplyEmail,
  type OrderOfferFromKey,
} from "../services/email";

type ContactMessageRow = RowDataPacket & {
  id: number;
  first_name: string;
  surname: string;
  company_name: string | null;
  vat_number: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  message: string;
  attachment_names: string | null;
  status: string;
  reply_message: string | null;
  replied_at: string | null;
  replied_from: string | null;
  created_at: string;
};

const ALLOWED_OFFER_FROM_KEYS = new Set<OrderOfferFromKey>([
  "info",
  "b2b",
  "orders",
]);

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRequiredString(value: unknown): string | null {
  const normalized = toOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : null;
}

function mapRow(row: ContactMessageRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    surname: row.surname,
    customerName:
      [row.first_name, row.surname].filter(Boolean).join(" ").trim() ||
      row.company_name ||
      "Unknown",
    companyName: row.company_name ?? "",
    vatNumber: row.vat_number ?? "",
    email: row.email,
    phone: row.phone ?? "",
    country: row.country ?? "",
    message: row.message ?? "",
    attachmentNames: row.attachment_names ?? "",
    status: row.status,
    replyMessage: row.reply_message ?? null,
    repliedAt: row.replied_at ?? null,
    repliedFrom: row.replied_from ?? null,
    createdAt: row.created_at,
  };
}

export const contactRouter = Router();

// Public: persist an incoming contact form submission.
contactRouter.post("/", async (req, res) => {
  const payload = (req.body ?? {}) as Record<string, unknown>;

  const firstName = toRequiredString(payload.firstName);
  const surname = toRequiredString(payload.surname);
  const email = toRequiredString(payload.email);
  const message = toRequiredString(payload.message);

  if (!firstName || !surname || !email || !message) {
    res.status(400).json({
      ok: false,
      message: "Invalid contact payload",
    });
    return;
  }

  try {
    const [result] = await mysqlPool.execute<ResultSetHeader>(
      `INSERT INTO contact_messages
        (first_name, surname, company_name, vat_number, email, phone, country, message, attachment_names)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        surname,
        toOptionalString(payload.companyName),
        toOptionalString(payload.vatNumber),
        email,
        toOptionalString(payload.phone),
        toOptionalString(payload.country),
        message,
        toOptionalString(payload.attachmentNames),
      ],
    );

    res.status(201).json({
      ok: true,
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Failed to store contact message", error);
    res.status(500).json({
      ok: false,
      message: "Failed to store contact message",
    });
  }
});

// Admin: list all contact messages.
contactRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const [rows] = await mysqlPool.query<ContactMessageRow[]>(
      `SELECT id, first_name, surname, company_name, vat_number, email, phone,
              country, message, attachment_names, status, reply_message,
              replied_at, replied_from, created_at
       FROM contact_messages
       ORDER BY created_at DESC, id DESC`,
    );
    res.json({ ok: true, data: rows.map(mapRow) });
  } catch (error) {
    console.error("Failed to load contact messages", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load contact messages",
    });
  }
});

// Admin: configured sender addresses for replies.
contactRouter.get("/reply-senders", requireAdmin, (_req, res) => {
  const senders = getOrderOfferSenderOptions();
  res.json({
    ok: true,
    data: senders,
    defaultKey: resolveDefaultOrderOfferFromKey(senders),
  });
});

// Admin: single contact message.
contactRouter.get("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ ok: false, message: "Invalid message id" });
    return;
  }

  try {
    const [rows] = await mysqlPool.query<ContactMessageRow[]>(
      `SELECT id, first_name, surname, company_name, vat_number, email, phone,
              country, message, attachment_names, status, reply_message,
              replied_at, replied_from, created_at
       FROM contact_messages
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, message: "Message not found" });
      return;
    }
    // Mark as read when opened (only bump 'new' -> 'read').
    if (rows[0]!.status === "new") {
      await mysqlPool.execute(
        `UPDATE contact_messages SET status = 'read' WHERE id = ? AND status = 'new'`,
        [id],
      );
      rows[0]!.status = "read";
    }
    res.json({ ok: true, data: mapRow(rows[0]!) });
  } catch (error) {
    console.error("Failed to load contact message", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load contact message",
    });
  }
});

// Admin: reply to a contact message via email and record it.
contactRouter.post("/:id/reply", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const body = (req.body ?? {}) as { fromKey?: unknown; message?: unknown };
  const fromKey = toRequiredString(body.fromKey) as OrderOfferFromKey | null;
  const replyMessage = toRequiredString(body.message);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ ok: false, message: "Invalid message id" });
    return;
  }
  if (!fromKey || !ALLOWED_OFFER_FROM_KEYS.has(fromKey)) {
    res.status(400).json({ ok: false, message: "Invalid sender address" });
    return;
  }
  if (!replyMessage) {
    res.status(400).json({ ok: false, message: "Reply message is required" });
    return;
  }
  if (!isEmailTransportConfigured()) {
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
    const [rows] = await mysqlPool.query<ContactMessageRow[]>(
      `SELECT id, first_name, surname, company_name, email, message
       FROM contact_messages WHERE id = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, message: "Message not found" });
      return;
    }

    const row = rows[0]!;
    const customerEmail = row.email?.trim();
    if (!customerEmail) {
      res.status(400).json({
        ok: false,
        message: "Message has no customer email",
      });
      return;
    }

    const customerName =
      [row.first_name, row.surname].filter(Boolean).join(" ").trim() ||
      row.company_name ||
      "";

    await sendContactReplyEmail({
      fromKey,
      to: customerEmail,
      customerName,
      originalMessage: row.message ?? "",
      replyMessage,
    });

    const repliedFrom =
      senderOptions.find((option) => option.key === fromKey)?.email ?? null;
    await mysqlPool.execute(
      `UPDATE contact_messages
       SET status = 'replied', reply_message = ?, replied_at = CURRENT_TIMESTAMP, replied_from = ?
       WHERE id = ?`,
      [replyMessage, repliedFrom, id],
    );

    const [updatedRows] = await mysqlPool.query<ContactMessageRow[]>(
      `SELECT replied_at, replied_from FROM contact_messages WHERE id = ? LIMIT 1`,
      [id],
    );

    res.json({
      ok: true,
      data: {
        id,
        to: customerEmail,
        repliedFrom,
        repliedAt: updatedRows[0]?.replied_at ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to send contact reply", error);
    const detail =
      error instanceof Error ? error.message.trim() : "Failed to send reply";
    res.status(500).json({
      ok: false,
      message:
        detail && detail !== "Failed to send reply"
          ? `Nu s-a putut trimite răspunsul: ${detail}`
          : "Nu s-a putut trimite răspunsul. Verifică setările SMTP.",
    });
  }
});
