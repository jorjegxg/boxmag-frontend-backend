import nodemailer from "nodemailer";
import { env } from "../config/env";
import type { CartLineItem } from "../utils/cart-items";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth:
    env.smtpUser && env.smtpPass
      ? {
          user: env.smtpUser,
          pass: env.smtpPass,
        }
      : undefined,
});

export type OrderEmailPriceBreakdown = {
  subtotal: number | null;
  vatPercent: number | null;
  vatAmount: number | null;
  shipping: number | null;
  total: number | null;
  currency: string | null;
  shippingMethod: string | null;
  shippingEta: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount: number, currency: string | null): string {
  const code = (currency ?? "EUR").toUpperCase();
  const symbol =
    code === "EUR" ? "€" : code === "USD" ? "$" : code === "GBP" ? "£" : `${code} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatMoneyOrDash(amount: number, currency: string | null): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return formatMoney(amount, currency);
}

function resolveLineItems(
  items: CartLineItem[] | null | undefined,
  fallback: {
    boxTypeName: string;
    cardboardType: string;
    cardboardColour: string;
    boxPrint: string;
    sizeType: string;
    lengthMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
    quantity: number;
  },
): CartLineItem[] {
  if (items && items.length > 0) return items;

  const sizeText =
    fallback.lengthMm != null &&
    fallback.widthMm != null &&
    fallback.heightMm != null
      ? `${fallback.lengthMm} x ${fallback.widthMm} x ${fallback.heightMm} mm`
      : fallback.sizeType;

  return [
    {
      itemNo: fallback.boxTypeName,
      name: [
        fallback.cardboardType,
        fallback.cardboardColour,
        fallback.boxPrint,
        sizeText,
      ]
        .filter(Boolean)
        .join(" · "),
      unitPrice: 0,
      quantity: fallback.quantity,
      lineTotal: 0,
      imageUrl: null,
    },
  ];
}

function buildProductsTableText(
  lineItems: CartLineItem[],
  currency: string | null,
): string {
  const header = ["Cod", "Produs", "Cant.", "Pret unitar", "Total linie"].join(
    "\t",
  );
  const rows = lineItems.map((item) =>
    [
      item.itemNo || "—",
      item.name,
      String(item.quantity),
      item.unitPrice > 0 ? formatMoney(item.unitPrice, currency) : "—",
      item.lineTotal > 0 ? formatMoney(item.lineTotal, currency) : "—",
    ].join("\t"),
  );
  return [header, ...rows].join("\n");
}

function buildProductsTableHtml(
  lineItems: CartLineItem[],
  currency: string | null,
): string {
  const rows = lineItems
    .map(
      (item, index) => `
      <tr style="background:${index % 2 === 0 ? "#ffffff" : "#f9fafb"};">
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${escapeHtml(item.itemNo || "—")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;">${escapeHtml(formatMoneyOrDash(item.unitPrice, currency))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;font-weight:600;">${escapeHtml(formatMoneyOrDash(item.lineTotal, currency))}</td>
      </tr>`,
    )
    .join("");

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
      <thead>
        <tr style="background:#ef6b56;color:#ffffff;">
          <th align="left" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Cod</th>
          <th align="left" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Produs</th>
          <th align="center" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Cant.</th>
          <th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Pret unitar</th>
          <th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Total linie</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      ${
        subtotal > 0
          ? `<tfoot>
        <tr style="background:#fff7ed;">
          <td colspan="4" align="right" style="padding:12px;font-size:13px;font-weight:700;color:#374151;">Subtotal produse</td>
          <td align="right" style="padding:12px;font-size:14px;font-weight:700;color:#b91c1c;">${escapeHtml(formatMoney(subtotal, currency))}</td>
        </tr>
      </tfoot>`
          : ""
      }
    </table>`;
}

function buildPriceBreakdownHtml(
  breakdown: OrderEmailPriceBreakdown,
): string {
  const currency = breakdown.currency;
  const rows: string[] = [];

  if (breakdown.subtotal != null) {
    rows.push(
      `<tr><td style="padding:6px 0;color:#4b5563;">Subtotal</td><td align="right" style="padding:6px 0;font-weight:600;">${escapeHtml(formatMoney(breakdown.subtotal, currency))}</td></tr>`,
    );
  }
  if (breakdown.vatAmount != null) {
    const vatLabel =
      breakdown.vatPercent != null
        ? `TVA (${breakdown.vatPercent}%)`
        : "TVA";
    rows.push(
      `<tr><td style="padding:6px 0;color:#4b5563;">${vatLabel}</td><td align="right" style="padding:6px 0;font-weight:600;">${escapeHtml(formatMoney(breakdown.vatAmount, currency))}</td></tr>`,
    );
  }
  if (breakdown.shipping != null) {
    const shippingLabel = breakdown.shippingMethod
      ? `Transport (${breakdown.shippingMethod}${breakdown.shippingEta ? ` · ${breakdown.shippingEta}` : ""})`
      : "Transport";
    rows.push(
      `<tr><td style="padding:6px 0;color:#4b5563;">${escapeHtml(shippingLabel)}</td><td align="right" style="padding:6px 0;font-weight:600;">${escapeHtml(formatMoney(breakdown.shipping, currency))}</td></tr>`,
    );
  }
  if (breakdown.total != null) {
    rows.push(
      `<tr><td style="padding:10px 0 0;color:#111827;font-weight:700;">Total comanda</td><td align="right" style="padding:10px 0 0;font-size:16px;font-weight:700;color:#b91c1c;">${escapeHtml(formatMoney(breakdown.total, currency))}</td></tr>`,
    );
  }

  if (rows.length === 0) return "";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px;">
      ${rows.join("")}
    </table>`;
}

function buildPriceBreakdownText(breakdown: OrderEmailPriceBreakdown): string {
  const currency = breakdown.currency;
  const lines: string[] = [];
  if (breakdown.subtotal != null) {
    lines.push(`Subtotal: ${formatMoney(breakdown.subtotal, currency)}`);
  }
  if (breakdown.vatAmount != null) {
    const vatLabel =
      breakdown.vatPercent != null
        ? `TVA (${breakdown.vatPercent}%)`
        : "TVA";
    lines.push(`${vatLabel}: ${formatMoney(breakdown.vatAmount, currency)}`);
  }
  if (breakdown.shipping != null) {
    lines.push(`Transport: ${formatMoney(breakdown.shipping, currency)}`);
  }
  if (breakdown.total != null) {
    lines.push(`Total comanda: ${formatMoney(breakdown.total, currency)}`);
  }
  return lines.join("\n");
}

export function isEmailTransportConfigured(): boolean {
  return Boolean(env.smtpUser && env.smtpPass && env.emailFrom);
}

export async function sendVerificationEmail(params: {
  to: string;
  verifyUrl: string;
  expiresMinutes: number;
}): Promise<void> {
  await transporter.sendMail({
    from: env.emailFrom,
    to: params.to,
    subject: "Confirm your Boxmag account",
    text: [
      "Welcome to Boxmag!",
      "",
      "Please confirm your email by opening this link:",
      params.verifyUrl,
      "",
      `This link expires in ${params.expiresMinutes} minutes.`,
    ].join("\n"),
    html: `
      <p>Welcome to <strong>Boxmag</strong>!</p>
      <p>Please confirm your email by clicking the link below:</p>
      <p><a href="${params.verifyUrl}">${params.verifyUrl}</a></p>
      <p>This link expires in <strong>${params.expiresMinutes} minutes</strong>.</p>
    `,
  });
}

export type NewOrderEmailParams = {
  orderId: number;
  customerName: string;
  customerEmail: string;
  companyName: string;
  vatNumber: string | null;
  customerPhone: string;
  customerAddress: string;
  customerPostcode: string;
  customerCity: string;
  customerCountry: string;
  createAccount: boolean;
  consentPhone: boolean;
  consentEmail: boolean;
  cardboardType: string;
  cardboardColour: string;
  boxPrint: string;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  sizeType: string;
  transport: string;
  quantity: number;
  ftl: boolean;
  attachmentName: string | null;
  boxTypeName: string;
  message: string;
  items?: CartLineItem[] | null;
  priceBreakdown?: OrderEmailPriceBreakdown | null;
};

function buildOrderEmailContent(params: NewOrderEmailParams) {
  const orderNumber = `ORD-${String(params.orderId).padStart(4, "0")}`;
  const sizeText =
    params.lengthMm != null && params.widthMm != null && params.heightMm != null
      ? `${params.lengthMm} x ${params.widthMm} x ${params.heightMm} mm (${params.sizeType})`
      : `N/A (${params.sizeType})`;
  const yesNo = (value: boolean) => (value ? "Da" : "Nu");
  const attachmentText = params.attachmentName ?? "N/A";
  const vatText = params.vatNumber ?? "N/A";
  const currency = params.priceBreakdown?.currency ?? "EUR";

  const lineItems = resolveLineItems(params.items, {
    boxTypeName: params.boxTypeName,
    cardboardType: params.cardboardType,
    cardboardColour: params.cardboardColour,
    boxPrint: params.boxPrint,
    sizeType: params.sizeType,
    lengthMm: params.lengthMm,
    widthMm: params.widthMm,
    heightMm: params.heightMm,
    quantity: params.quantity,
  });

  const productsTableText = buildProductsTableText(lineItems, currency);
  const productsTableHtml = buildProductsTableHtml(lineItems, currency);
  const priceBreakdownText = params.priceBreakdown
    ? buildPriceBreakdownText(params.priceBreakdown)
    : "";
  const priceBreakdownHtml = params.priceBreakdown
    ? buildPriceBreakdownHtml(params.priceBreakdown)
    : "";

  const customerMessage = params.message.trim();
  const hideStripeDump =
    customerMessage.startsWith("Stripe checkout cart order") &&
    (params.items?.length ?? 0) > 0;
  const displayMessage = hideStripeDump ? "" : customerMessage;
  return {
    orderNumber,
    sizeText,
    yesNo,
    attachmentText,
    vatText,
    productsTableText,
    productsTableHtml,
    priceBreakdownText,
    priceBreakdownHtml,
    displayMessage,
  };
}

export async function sendNewOrderNotificationEmail(
  params: NewOrderEmailParams,
): Promise<void> {
  const {
    orderNumber,
    sizeText,
    yesNo,
    attachmentText,
    vatText,
    productsTableText,
    productsTableHtml,
    priceBreakdownText,
    priceBreakdownHtml,
    displayMessage,
  } = buildOrderEmailContent(params);

  await transporter.sendMail({
    from: env.emailFrom,
    to: "comenzi@reko-packaging.ro",
    subject: `Comanda noua ${orderNumber}`,
    text: [
      "A fost creata o comanda noua in platforma Boxmag.",
      "",
      `Numar comanda: ${orderNumber}`,
      `Client: ${params.customerName}`,
      `Companie: ${params.companyName}`,
      `Email client: ${params.customerEmail}`,
      `Telefon: ${params.customerPhone}`,
      `Adresa: ${params.customerAddress}`,
      `Cod postal: ${params.customerPostcode}`,
      `Oras: ${params.customerCity}`,
      `Tara: ${params.customerCountry}`,
      `TVA: ${vatText}`,
      `Creeaza cont: ${yesNo(params.createAccount)}`,
      `Consimtamant telefon: ${yesNo(params.consentPhone)}`,
      `Consimtamant email: ${yesNo(params.consentEmail)}`,
      `Box type: ${params.boxTypeName}`,
      `Cardboard type: ${params.cardboardType}`,
      `Cardboard colour: ${params.cardboardColour}`,
      `Box print: ${params.boxPrint}`,
      `Dimensiune: ${sizeText}`,
      `Transport: ${params.transport}`,
      `Cantitate totala: ${params.quantity}`,
      `FTL: ${yesNo(params.ftl)}`,
      `Attachment: ${attachmentText}`,
      "",
      "Produse:",
      productsTableText,
      priceBreakdownText ? `\n${priceBreakdownText}` : "",
      displayMessage ? `\nMesaj client:\n${displayMessage}` : "",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5;max-width:720px;">
        <p style="margin:0 0 16px;">A fost creata o comanda noua in platforma <strong>Boxmag</strong>.</p>
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#b91c1c;">${escapeHtml(orderNumber)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
          <tr><td style="padding:4px 0;color:#6b7280;width:180px;">Client</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(params.customerName)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Companie</td><td style="padding:4px 0;">${escapeHtml(params.companyName)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(params.customerEmail)}">${escapeHtml(params.customerEmail)}</a></td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Telefon</td><td style="padding:4px 0;">${escapeHtml(params.customerPhone)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Adresa</td><td style="padding:4px 0;">${escapeHtml(params.customerAddress)}, ${escapeHtml(params.customerPostcode)} ${escapeHtml(params.customerCity)}, ${escapeHtml(params.customerCountry)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">TVA client</td><td style="padding:4px 0;">${escapeHtml(vatText)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Transport</td><td style="padding:4px 0;">${escapeHtml(params.transport)}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Attachment</td><td style="padding:4px 0;">${escapeHtml(attachmentText)}</td></tr>
        </table>
        <h3 style="margin:0 0 8px;font-size:15px;color:#111827;">Produse comandate</h3>
        ${productsTableHtml}
        ${priceBreakdownHtml}
        ${
          displayMessage
            ? `<div style="margin-top:20px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
          <p style="margin:0 0 8px;font-weight:700;">Mesaj client</p>
          <p style="margin:0;white-space:pre-line;">${escapeHtml(displayMessage)}</p>
        </div>`
            : ""
        }
      </div>
    `,
  });
}

export async function sendOrderConfirmationEmailToCustomer(
  params: NewOrderEmailParams,
): Promise<void> {
  const {
    orderNumber,
    productsTableText,
    productsTableHtml,
    priceBreakdownText,
    priceBreakdownHtml,
    displayMessage,
  } = buildOrderEmailContent(params);

  await transporter.sendMail({
    from: env.emailFrom,
    to: params.customerEmail,
    subject: `Confirmare comanda ${orderNumber}`,
    text: [
      `Salut ${params.customerName || "client"},`,
      "",
      "Iti confirmam ca am primit comanda ta pe Boxmag.",
      `Numar comanda: ${orderNumber}`,
      "",
      "Produse:",
      productsTableText,
      priceBreakdownText ? `\n${priceBreakdownText}` : "",
      displayMessage ? `\nMesajul tau:\n${displayMessage}` : "",
      "",
      "Iti multumim pentru comanda!",
      "Echipa Boxmag",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5;max-width:720px;">
        <p style="margin:0 0 12px;">Salut ${escapeHtml(params.customerName || "client")},</p>
        <p style="margin:0 0 12px;">Iti confirmam ca am primit comanda ta pe <strong>Boxmag</strong>.</p>
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#b91c1c;">${escapeHtml(orderNumber)}</p>
        <h3 style="margin:16px 0 8px;font-size:15px;color:#111827;">Produse comandate</h3>
        ${productsTableHtml}
        ${priceBreakdownHtml}
        ${
          displayMessage
            ? `<div style="margin-top:20px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
          <p style="margin:0 0 8px;font-weight:700;">Mesajul tau</p>
          <p style="margin:0;white-space:pre-line;">${escapeHtml(displayMessage)}</p>
        </div>`
            : ""
        }
        <p style="margin:20px 0 0;">Iti multumim pentru comanda!</p>
        <p style="margin:4px 0 0;">Echipa Boxmag</p>
      </div>
    `,
  });
}
