import { Router } from "express";
import { ResultSetHeader } from "mysql2";
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
