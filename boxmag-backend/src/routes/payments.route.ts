import { Request, Response, Router } from "express";
import Stripe from "stripe";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { PoolConnection } from "mysql2/promise";
import { mysqlPool } from "../db/mysql";
import { env } from "../config/env";
import {
  isOrderEmailTransportConfigured,
  sendOrderConfirmationEmailToCustomer,
  sendNewOrderNotificationEmail,
} from "../services/email";
import { getStripeClient, isStripeConfigured } from "../services/stripe";
import { parseCartItemsJson } from "../utils/cart-items";
import { MIN_ORDER_QTY } from "../constants/order";
import {
  MAX_ORDER_ATTACHMENT_BYTES,
  MAX_ORDER_ATTACHMENT_MB,
} from "../config/uploads";
import { uploadOrderAttachmentToMinio } from "../services/minio";
import {
  convertEurToRon,
  getEurRonRate,
  roundMoney,
} from "../services/exchange-rate.service";
import {
  resolveCheckoutCartItems,
  resolveShippingMethod,
} from "../services/checkout-pricing";
import { checkoutRateLimiter } from "../middleware/rate-limit";
import { getRequestUserSession } from "../middleware/require-user";

type CartItemPayload = {
  itemNo: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
};

type AddressPayload = {
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
};

type CheckoutCurrency = "eur" | "ron";

type CreateCheckoutSessionPayload = {
  email?: unknown;
  cartItems?: unknown;
  currency?: unknown;
  shipping?: {
    key?: unknown;
    name?: unknown;
    etaText?: unknown;
    price?: unknown;
  };
  vatPercent?: unknown;
  address?: AddressPayload;
  vatNumber?: unknown;
  consentPhone?: unknown;
  consentEmail?: unknown;
  acceptedTerms?: unknown;
  attachment?: unknown;
};

type AttachmentPayload = {
  fileName: string;
  contentBase64: string;
  mimeType?: string | null;
};

function toRequiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const VAT_NUMBER_REGEX = /^([A-Z]{2})?[A-Z0-9]{2,12}$/;

function normalizeVatNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function parseVatNumber(value: unknown): string | null {
  const raw = toRequiredString(value);
  if (!raw) return null;
  const normalized = normalizeVatNumber(raw);
  return VAT_NUMBER_REGEX.test(normalized) ? normalized : null;
}

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = toNonNegativeNumber(value);
  if (parsed == null) return null;
  const rounded = Math.floor(parsed);
  return rounded > 0 ? rounded : null;
}

function parseCheckoutCurrency(value: unknown): CheckoutCurrency {
  if (typeof value !== "string") {
    return (env.stripeCurrency || "eur").toLowerCase() === "ron" ? "ron" : "eur";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "ron") return "ron";
  return "eur";
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function parseAttachmentPayload(value: unknown): AttachmentPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const fileName = toRequiredString(candidate.fileName);
  const contentBase64 = toRequiredString(candidate.contentBase64);
  if (!fileName || !contentBase64) return null;
  return {
    fileName,
    contentBase64,
    mimeType: toRequiredString(candidate.mimeType),
  };
}

function parseAttachmentBase64(value: string): Buffer | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const base64Payload = trimmed.includes(",")
    ? trimmed.slice(trimmed.indexOf(",") + 1)
    : trimmed;
  try {
    const buffer = Buffer.from(base64Payload, "base64");
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

function parseCartItems(value: unknown): CartItemPayload[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: CartItemPayload[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const candidate = raw as Record<string, unknown>;
    const itemNo = toRequiredString(candidate.itemNo);
    const name = toRequiredString(candidate.name);
    const unitPrice = toNonNegativeNumber(candidate.unitPrice);
    const quantity = toPositiveInt(candidate.quantity);
    if (!itemNo || !name || unitPrice == null || quantity == null) {
      return null;
    }
    const imageUrl =
      typeof candidate.imageUrl === "string" ? candidate.imageUrl : undefined;
    parsed.push({
      itemNo,
      name,
      unitPrice,
      quantity,
      ...(imageUrl ? { imageUrl } : {}),
    });
  }
  return parsed;
}

function parseAddress(value: unknown): AddressPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const firstName = toRequiredString(candidate.firstName);
  const lastName = toRequiredString(candidate.lastName);
  const address = toRequiredString(candidate.address);
  const postcode = toRequiredString(candidate.postcode);
  const city = toRequiredString(candidate.city);
  const country = toRequiredString(candidate.country);
  if (!firstName || !lastName || !address || !postcode || !city || !country) {
    return null;
  }
  return {
    firstName,
    lastName,
    address,
    postcode,
    city,
    country,
    companyName: toRequiredString(candidate.companyName) ?? "",
    phone: toRequiredString(candidate.phone) ?? "",
  };
}

type OrderRow = RowDataPacket & {
  id: number;
  status: string;
  payment_status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  total_amount_cents: number | null;
  subtotal_cents: number | null;
  vat_percent: string | number | null;
  vat_cents: number | null;
  shipping_cents: number | null;
  shipping_method: string | null;
  shipping_eta: string | null;
  currency: string | null;
  box_type_name: string;
  cardboard_type: string;
  cardboard_colour: string;
  box_print: string;
  size_type: string;
  transport: string;
  quantity: number;
  attachment_name: string | null;
  attachment_object_name: string | null;
  attachment_url: string | null;
  message: string | null;
  items_json: string | null;
  created_at: string;
};

function centsToAmount(value: number | null): number | null {
  if (value == null) return null;
  return Math.round(value) / 100;
}

function vatPercentToNumber(value: string | number | null): number | null {
  if (value == null) return null;
  const num = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(num) ? num : null;
}

type ContactRow = RowDataPacket & {
  first_name: string;
  surname: string;
  company_name: string;
  vat_number: string | null;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
  create_account: number;
  consent_phone: number;
  consent_email: number;
};

export const paymentsRouter = Router();

paymentsRouter.post("/create-checkout-session", checkoutRateLimiter, async (req, res) => {
  if (!isStripeConfigured()) {
    res.status(503).json({
      ok: false,
      message:
        "Stripe is not configured on the server. Set STRIPE_SECRET_KEY in .env.",
    });
    return;
  }

  const payload = (req.body ?? {}) as CreateCheckoutSessionPayload;
  const email = toRequiredString(payload.email);
  const cartItems = parseCartItems(payload.cartItems);
  const address = parseAddress(payload.address);
  const shippingKey = toRequiredString(payload.shipping?.key);
  const attachmentPayload = parseAttachmentPayload(payload.attachment);
  // Always use server TAX_PERCENT — never trust client vatPercent.
  const vatPercent = env.taxPercent ?? 0;
  const vatNumber = parseVatNumber(payload.vatNumber);

  if (
    !email ||
    !cartItems ||
    cartItems.length === 0 ||
    !address ||
    !shippingKey ||
    !vatNumber
  ) {
    res.status(400).json({
      ok: false,
      message:
        "Invalid checkout payload. Provide email, VAT number, address, shipping key and at least one cart item.",
    });
    return;
  }

  const belowMinQty = cartItems.find((item) => item.quantity < MIN_ORDER_QTY);
  if (belowMinQty) {
    res.status(400).json({
      ok: false,
      message: `Minimum order quantity is ${MIN_ORDER_QTY} pcs per product. Item ${belowMinQty.itemNo} has quantity ${belowMinQty.quantity}.`,
    });
    return;
  }

  let resolvedCartItems;
  let resolvedShipping;
  try {
    const cartResult = await resolveCheckoutCartItems(
      cartItems.map((item) => ({
        itemNo: item.itemNo,
        quantity: item.quantity,
        ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      })),
    );
    if (!cartResult.ok) {
      res.status(400).json({ ok: false, message: cartResult.message });
      return;
    }
    resolvedCartItems = cartResult.items;

    const shippingResult = await resolveShippingMethod(shippingKey);
    if (!shippingResult.ok) {
      res.status(400).json({ ok: false, message: shippingResult.message });
      return;
    }
    resolvedShipping = shippingResult.shipping;
  } catch (pricingError) {
    console.error("Failed to resolve checkout prices", pricingError);
    res.status(500).json({
      ok: false,
      message: "Failed to verify checkout prices.",
    });
    return;
  }

  const shippingName = resolvedShipping.name;
  const shippingEta = resolvedShipping.etaText;
  const shippingPrice = resolvedShipping.price;

  const totalQuantity = resolvedCartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const subtotalEur = +resolvedCartItems
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    .toFixed(2);
  const vatAmountEur = +((subtotalEur * vatPercent) / 100).toFixed(2);
  const shippingPriceEur = +shippingPrice.toFixed(2);
  const totalEur = +(subtotalEur + vatAmountEur + shippingPriceEur).toFixed(2);

  const checkoutCurrency = parseCheckoutCurrency(payload.currency);
  let chargeCurrency: CheckoutCurrency = checkoutCurrency;
  let eurRonRate: number | null = null;

  if (checkoutCurrency === "ron") {
    try {
      const rateData = await getEurRonRate();
      eurRonRate = rateData.rate;
    } catch (rateError) {
      console.error("Failed to load EUR/RON rate for checkout", rateError);
      res.status(503).json({
        ok: false,
        message: "Failed to load EUR/RON exchange rate for checkout.",
      });
      return;
    }
  }

  const convertForCharge = (amountEur: number): number =>
    chargeCurrency === "ron" && eurRonRate != null
      ? convertEurToRon(amountEur, eurRonRate)
      : roundMoney(amountEur);

  const chargedCartItems = resolvedCartItems.map((item) => ({
    ...item,
    unitPrice: convertForCharge(item.unitPrice),
    lineTotal: convertForCharge(item.unitPrice * item.quantity),
  }));

  const subtotal = convertForCharge(subtotalEur);
  const vatAmount = convertForCharge(vatAmountEur);
  const shippingPriceCharged = convertForCharge(shippingPriceEur);
  const total = convertForCharge(totalEur);
  const currency = chargeCurrency;

  const orderMessageLines = [
    "Stripe checkout cart order",
    "",
    "Items:",
    ...chargedCartItems.map(
      (item) =>
        `- ${item.itemNo} | ${item.name} | qty ${item.quantity} | unit ${item.unitPrice.toFixed(2)} | line ${item.lineTotal.toFixed(2)}`,
    ),
    "",
    `Shipping method: ${shippingName} (${shippingEta})`,
    ...(eurRonRate != null
      ? [`Exchange rate EUR/RON: ${eurRonRate.toFixed(4)}`, ""]
      : []),
    `Subtotal: ${subtotal.toFixed(2)} ${currency.toUpperCase()}`,
    `VAT (${vatPercent}%): ${vatAmount.toFixed(2)} ${currency.toUpperCase()}`,
    `Shipping: ${shippingPriceCharged.toFixed(2)} ${currency.toUpperCase()}`,
    `Total: ${total.toFixed(2)} ${currency.toUpperCase()}`,
  ];

  let connection: PoolConnection | undefined;
  let createdOrderId: number | null = null;
  let attachmentName: string | null = null;
  let attachmentObjectName: string | null = null;
  if (attachmentPayload) {
    const attachmentBuffer = parseAttachmentBase64(attachmentPayload.contentBase64);
    if (!attachmentBuffer) {
      res.status(400).json({
        ok: false,
        message: "Invalid attachment payload.",
      });
      return;
    }
    if (attachmentBuffer.length > MAX_ORDER_ATTACHMENT_BYTES) {
      res.status(400).json({
        ok: false,
        message: `Attachment is too large. Maximum allowed size is ${MAX_ORDER_ATTACHMENT_MB} MB.`,
      });
      return;
    }
    try {
      const uploaded = await uploadOrderAttachmentToMinio({
        fileBuffer: attachmentBuffer,
        originalFileName: attachmentPayload.fileName,
        ...(attachmentPayload.mimeType ? { mimeType: attachmentPayload.mimeType } : {}),
      });
      attachmentName = attachmentPayload.fileName;
      attachmentObjectName = uploaded.objectName;
    } catch (uploadError) {
      console.error("Failed to upload checkout attachment to MinIO", uploadError);
      res.status(502).json({
        ok: false,
        message: "Failed to upload attachment.",
      });
      return;
    }
  }

  try {
    connection = await mysqlPool.getConnection();
    const conn = connection;
    await conn.beginTransaction();

    const itemsJson = JSON.stringify(
      chargedCartItems.map((item) => ({
        itemNo: item.itemNo,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        imageUrl: item.imageUrl ?? null,
      })),
    );

    // Link only when signed session email matches checkout email (INV-GUEST-LINK).
    const userSession = getRequestUserSession(req);
    const normalizedOrderEmail = email.toLowerCase();
    const linkedUserId =
      userSession && userSession.email === normalizedOrderEmail
        ? userSession.userId
        : null;

    const [orderInsertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO orders
        (user_id, box_type_name, cardboard_type, cardboard_colour, box_print,
         size_type, transport, quantity, ftl, attachment_name, attachment_object_name, attachment_url, message, items_json,
         accepted_terms, status, payment_status,
         total_amount_cents, subtotal_cents, vat_percent, vat_cents,
         shipping_cents, shipping_method, shipping_eta, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        linkedUserId,
        "Checkout Cart Order",
        "N/A",
        "N/A",
        "N/A",
        "N/A",
        shippingName,
        totalQuantity || 1,
        0,
        attachmentName,
        attachmentObjectName,
        null,
        orderMessageLines.join("\n"),
        itemsJson,
        1,
        "new",
        "pending",
        toCents(total),
        toCents(subtotal),
        vatPercent,
        toCents(vatAmount),
        toCents(shippingPriceCharged),
        shippingName,
        shippingEta,
        currency,
      ],
    );

    createdOrderId = orderInsertResult.insertId;

    await conn.execute(
      `INSERT INTO contacts
        (order_id, first_name, surname, company_name, vat_number, email, phone, address, postcode, city, country,
         create_account, consent_phone, consent_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createdOrderId,
        address.firstName,
        address.lastName,
        address.companyName ||
          `${address.firstName} ${address.lastName}`.trim(),
        vatNumber,
        email,
        address.phone || "N/A",
        address.address,
        address.postcode,
        address.city,
        address.country,
        0,
        payload.consentPhone === true ? 1 : 0,
        payload.consentEmail === true ? 1 : 0,
      ],
    );

    await conn.commit();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_rollbackError) {
        // best effort
      }
    }
    console.error("Failed to persist order before Stripe checkout", error);
    res.status(500).json({
      ok: false,
      message: "Failed to save order before payment.",
    });
    return;
  } finally {
    connection?.release();
  }

  const stripe = getStripeClient();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = chargedCartItems.map(
    (item) => {
      const imagesArr = item.imageUrl?.startsWith("http")
        ? [item.imageUrl]
        : undefined;
      return {
        quantity: item.quantity,
        price_data: {
          currency,
          unit_amount: toCents(item.unitPrice),
          product_data: {
            name: item.name,
            description: `Item No: ${item.itemNo}`,
            ...(imagesArr ? { images: imagesArr } : {}),
          },
        },
      };
    },
  );

  if (vatAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toCents(vatAmount),
        product_data: {
          name: `VAT (${vatPercent}%)`,
        },
      },
    });
  }

  if (shippingPriceCharged > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toCents(shippingPriceCharged),
        product_data: {
          name: `Shipping - ${shippingName}`,
          ...(shippingEta ? { description: shippingEta } : {}),
        },
      },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: lineItems,
      success_url: env.stripeSuccessUrl,
      cancel_url: env.stripeCancelUrl,
      metadata: {
        order_id: String(createdOrderId),
        cart_total_quantity: String(totalQuantity),
        charge_currency: currency,
        ...(eurRonRate != null
          ? { eur_ron_rate: eurRonRate.toFixed(4) }
          : {}),
      },
      payment_intent_data: {
        metadata: {
          order_id: String(createdOrderId),
          charge_currency: currency,
          ...(eurRonRate != null
            ? { eur_ron_rate: eurRonRate.toFixed(4) }
            : {}),
        },
      },
    });

    await mysqlPool.execute(
      `UPDATE orders SET stripe_session_id = ? WHERE id = ?`,
      [session.id, createdOrderId],
    );

    res.json({
      ok: true,
      data: {
        orderId: createdOrderId,
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error("Failed to create Stripe Checkout Session", error);
    if (createdOrderId != null) {
      try {
        await mysqlPool.execute(
          `UPDATE orders SET payment_status = 'failed' WHERE id = ?`,
          [createdOrderId],
        );
      } catch (_updateError) {
        // best effort
      }
    }
    res.status(502).json({
      ok: false,
      message:
        error instanceof Error
          ? `Stripe error: ${error.message}`
          : "Failed to create Stripe Checkout Session.",
    });
  }
});

paymentsRouter.get("/sessions/:sessionId", async (req, res) => {
  if (!isStripeConfigured()) {
    res.status(503).json({
      ok: false,
      message: "Stripe is not configured on the server.",
    });
    return;
  }

  const sessionId = String(req.params.sessionId ?? "").trim();
  if (!sessionId) {
    res.status(400).json({ ok: false, message: "Missing session id" });
    return;
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Read-only poll: do not mark paid here. Webhook is the sole paid-mark path.
    const [orderRows] = await mysqlPool.query<OrderRow[]>(
      `SELECT id FROM orders WHERE stripe_session_id = ? LIMIT 1`,
      [session.id],
    );

    const order = orderRows[0] ?? null;

    res.json({
      ok: true,
      data: {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email ?? null,
        order: order
          ? {
              id: order.id,
              orderNumber: `ORD-${String(order.id).padStart(4, "0")}`,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to retrieve Stripe session", error);
    res.status(502).json({
      ok: false,
      message:
        error instanceof Error
          ? `Stripe error: ${error.message}`
          : "Failed to retrieve Stripe session.",
    });
  }
});

async function markOrderPaidBySession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const [updateResult] = await mysqlPool.execute<ResultSetHeader>(
    `UPDATE orders
       SET payment_status = 'paid',
           stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
           total_amount_cents = COALESCE(?, total_amount_cents),
           currency = COALESCE(?, currency)
     WHERE stripe_session_id = ? AND payment_status <> 'paid'`,
    [
      paymentIntentId,
      session.amount_total ?? null,
      session.currency ?? null,
      session.id,
    ],
  );

  if (updateResult.affectedRows === 0) {
    return;
  }

  // Send the internal "new order" notification email now that payment is confirmed.
  if (!isOrderEmailTransportConfigured()) return;

  try {
    const [orderRows] = await mysqlPool.query<OrderRow[]>(
      `SELECT id, status, payment_status, stripe_session_id, stripe_payment_intent_id,
              total_amount_cents, subtotal_cents, vat_percent, vat_cents, shipping_cents,
              shipping_method, shipping_eta, currency, box_type_name, cardboard_type,
              cardboard_colour, box_print, size_type, transport, quantity, attachment_name,
              attachment_object_name, attachment_url, message, items_json, created_at
       FROM orders WHERE stripe_session_id = ? LIMIT 1`,
      [session.id],
    );
    const order = orderRows[0];
    if (!order) return;

    const cartItems = parseCartItemsJson(order.items_json);

    const [contactRows] = await mysqlPool.query<ContactRow[]>(
      `SELECT first_name, surname, company_name, vat_number, email, phone,
              address, postcode, city, country,
              create_account, consent_phone, consent_email
       FROM contacts WHERE order_id = ? LIMIT 1`,
      [order.id],
    );
    const contact = contactRows[0];
    if (!contact) return;

    await sendNewOrderNotificationEmail({
      orderId: order.id,
      customerName: `${contact.first_name} ${contact.surname}`.trim(),
      customerEmail: contact.email,
      companyName: contact.company_name,
      vatNumber: contact.vat_number,
      customerPhone: contact.phone,
      customerAddress: contact.address,
      customerPostcode: contact.postcode,
      customerCity: contact.city,
      customerCountry: contact.country,
      createAccount: Boolean(contact.create_account),
      consentPhone: Boolean(contact.consent_phone),
      consentEmail: Boolean(contact.consent_email),
      cardboardType: order.cardboard_type,
      cardboardColour: order.cardboard_colour,
      boxPrint: order.box_print,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      sizeType: order.size_type,
      transport: order.transport,
      quantity: order.quantity,
      ftl: false,
      attachmentName: order.attachment_name,
      attachmentObjectName: order.attachment_object_name,
      attachmentUrl: order.attachment_url,
      boxTypeName: order.box_type_name,
      message: order.message ?? "",
      items: cartItems,
      priceBreakdown: {
        subtotal: centsToAmount(order.subtotal_cents),
        vatPercent: vatPercentToNumber(order.vat_percent),
        vatAmount: centsToAmount(order.vat_cents),
        shipping: centsToAmount(order.shipping_cents),
        total: centsToAmount(order.total_amount_cents),
        currency: order.currency ?? null,
        shippingMethod: order.shipping_method ?? null,
        shippingEta: order.shipping_eta ?? null,
      },
    });
    await sendOrderConfirmationEmailToCustomer({
      orderId: order.id,
      customerName: `${contact.first_name} ${contact.surname}`.trim(),
      customerEmail: contact.email,
      companyName: contact.company_name,
      vatNumber: contact.vat_number,
      customerPhone: contact.phone,
      customerAddress: contact.address,
      customerPostcode: contact.postcode,
      customerCity: contact.city,
      customerCountry: contact.country,
      createAccount: Boolean(contact.create_account),
      consentPhone: Boolean(contact.consent_phone),
      consentEmail: Boolean(contact.consent_email),
      cardboardType: order.cardboard_type,
      cardboardColour: order.cardboard_colour,
      boxPrint: order.box_print,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      sizeType: order.size_type,
      transport: order.transport,
      quantity: order.quantity,
      ftl: false,
      attachmentName: order.attachment_name,
      attachmentObjectName: order.attachment_object_name,
      attachmentUrl: order.attachment_url,
      boxTypeName: order.box_type_name,
      message: order.message ?? "",
      items: cartItems,
      priceBreakdown: {
        subtotal: centsToAmount(order.subtotal_cents),
        vatPercent: vatPercentToNumber(order.vat_percent),
        vatAmount: centsToAmount(order.vat_cents),
        shipping: centsToAmount(order.shipping_cents),
        total: centsToAmount(order.total_amount_cents),
        currency: order.currency ?? null,
        shippingMethod: order.shipping_method ?? null,
        shippingEta: order.shipping_eta ?? null,
      },
    });
  } catch (emailError) {
    console.error("Stripe payment confirmed, but confirmation emails failed", emailError);
  }
}

// IMPORTANT: This handler expects the raw request body, mounted in app.ts
// using `express.raw({ type: "application/json" })` BEFORE the JSON parser.
export async function stripeWebhookHandler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!isStripeConfigured()) {
    res.status(503).send("Stripe is not configured");
    return;
  }
  if (!env.stripeWebhookSecret) {
    res.status(503).send("Stripe webhook secret is not configured");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).send("Missing Stripe signature");
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.stripeWebhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    res
      .status(400)
      .send(
        `Webhook signature verification failed: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markOrderPaidBySession(session);
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await mysqlPool.execute(
          `UPDATE orders SET payment_status = 'failed' WHERE stripe_session_id = ?`,
          [session.id],
        );
        break;
      }
      default:
        // No-op for events we don't currently handle.
        break;
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Failed to process Stripe webhook event", error);
    res.status(500).send("Webhook handler failure");
  }
}
