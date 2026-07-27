import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "../config/env";
import type { CartLineItem } from "../utils/cart-items";
import { getObjectBufferFromMinio } from "./minio";

type MailTransporter = Mail<SMTPTransport.SentMessageInfo>;

function createMailTransporter(user: string, pass: string): MailTransporter {
  const smtpUser = user.trim();
  const smtpPass = pass.trim();
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth:
      smtpUser && smtpPass
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
  });
}

const transporter = createMailTransporter(
  env.smtpUser,
  env.smtpPass,
);

let ordersTransporter: MailTransporter | null = null;

function getOrdersSmtpUser(): string {
  return env.emailOrdersSmtpUser.trim() || env.emailOrdersFrom.trim();
}

function isOrdersMailboxSmtpConfigured(): boolean {
  return Boolean(
    env.emailOrdersFrom.trim() &&
      getOrdersSmtpUser() &&
      env.emailOrdersSmtpPass.trim(),
  );
}

function getOrdersMailTransporter(): MailTransporter {
  if (!isOrdersMailboxSmtpConfigured()) {
    return transporter;
  }
  if (!ordersTransporter) {
    ordersTransporter = createMailTransporter(
      getOrdersSmtpUser(),
      env.emailOrdersSmtpPass,
    );
  }
  return ordersTransporter;
}

let b2bTransporter: MailTransporter | null = null;

function getB2bSmtpUser(): string {
  return env.emailB2bSmtpUser.trim() || env.b2bEmail.trim();
}

function isB2bMailboxSmtpConfigured(): boolean {
  return Boolean(
    env.b2bEmail.trim() && getB2bSmtpUser() && env.emailB2bSmtpPass.trim(),
  );
}

function getB2bMailTransporter(): MailTransporter {
  if (!isB2bMailboxSmtpConfigured()) {
    return transporter;
  }
  if (!b2bTransporter) {
    b2bTransporter = createMailTransporter(
      getB2bSmtpUser(),
      env.emailB2bSmtpPass,
    );
  }
  return b2bTransporter;
}

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
  includeLinePricing = true,
): string {
  const header = includeLinePricing
    ? ["Cod", "Produs", "Cant.", "Pret unitar", "Total linie"]
    : ["Cod", "Produs", "Cant."];
  const rows = lineItems.map((item) => {
    const base = [item.itemNo || "—", item.name, String(item.quantity)];
    if (!includeLinePricing) return base.join("\t");
    return [
      ...base,
      item.unitPrice > 0 ? formatMoney(item.unitPrice, currency) : "—",
      item.lineTotal > 0 ? formatMoney(item.lineTotal, currency) : "—",
    ].join("\t");
  });
  return [header.join("\t"), ...rows].join("\n");
}

function buildProductsTableHtml(
  lineItems: CartLineItem[],
  currency: string | null,
  includeLinePricing = true,
): string {
  const rows = lineItems
    .map(
      (item, index) => `
      <tr style="background:${index % 2 === 0 ? "#ffffff" : "#f9fafb"};">
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${escapeHtml(item.itemNo || "—")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:center;">${item.quantity}</td>
        ${
          includeLinePricing
            ? `<td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;">${escapeHtml(formatMoneyOrDash(item.unitPrice, currency))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;font-weight:600;">${escapeHtml(formatMoneyOrDash(item.lineTotal, currency))}</td>`
            : ""
        }
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
          ${
            includeLinePricing
              ? `<th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Pret unitar</th>
          <th align="right" style="padding:10px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Total linie</th>`
              : ""
          }
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      ${
        includeLinePricing && subtotal > 0
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

export function isOrderEmailTransportConfigured(): boolean {
  if (isOrdersMailboxSmtpConfigured()) {
    return true;
  }
  return Boolean(env.smtpUser && env.smtpPass && env.emailOrdersFrom);
}

function resolveAuthenticatedSmtpFromAddress(): string {
  return env.smtpUser.trim() || env.emailFrom.trim();
}

function buildMailboxHeaders(
  fromAddress: string,
  senderName = "Boxmag",
): {
  from: string;
  replyTo: string;
} {
  const address = fromAddress.trim();
  return {
    from: `"${senderName}" <${address}>`,
    replyTo: address,
  };
}

function buildOrdersMailboxHeaders(senderName = "Boxmag"): {
  from: string;
  replyTo: string;
} {
  return buildMailboxHeaders(env.emailOrdersFrom.trim(), senderName);
}

function getOrderCustomerMailDelivery(senderName = "Boxmag"): {
  transport: MailTransporter;
  headers: { from: string; replyTo: string };
} {
  if (isOrdersMailboxSmtpConfigured()) {
    return {
      transport: getOrdersMailTransporter(),
      headers: buildOrdersMailboxHeaders(senderName),
    };
  }

  return {
    transport: transporter,
    headers: buildCustomerMailHeaders({
      replyTo: env.emailOrdersFrom,
      senderName,
    }),
  };
}

function parseNotificationRecipients(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isOrderNotificationRecipientConfigured(): boolean {
  return Boolean(env.ordersNotificationTo.trim());
}

export type OrderCreationEmailResult = {
  notification: boolean;
  customerConfirmation: boolean;
  errors: string[];
};

export async function sendOrderCreationEmails(
  params: NewOrderEmailParams,
): Promise<OrderCreationEmailResult> {
  const result: OrderCreationEmailResult = {
    notification: false,
    customerConfirmation: false,
    errors: [],
  };

  if (!isOrderEmailTransportConfigured()) {
    console.warn(
      JSON.stringify({
        event: "order_email_skipped",
        orderId: params.orderId,
        reason: "smtp_not_configured",
      }),
    );
    result.errors.push("smtp_not_configured");
    return result;
  }

  if (!isOrderNotificationRecipientConfigured()) {
    console.warn(
      JSON.stringify({
        event: "order_email_skipped",
        orderId: params.orderId,
        reason: "orders_notification_to_missing",
      }),
    );
    result.errors.push("orders_notification_to_missing");
  } else {
    try {
      await sendNewOrderNotificationEmail(params);
      result.notification = true;
      console.info(
        JSON.stringify({
          event: "order_notification_email_sent",
          orderId: params.orderId,
          to: env.ordersNotificationTo.trim(),
          from: env.emailOrdersFrom.trim(),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          event: "order_notification_email_failed",
          orderId: params.orderId,
          to: env.ordersNotificationTo.trim(),
          error: message,
        }),
      );
      result.errors.push(`notification_failed:${message}`);
    }
  }

  try {
    await sendBusinessOrderConfirmationEmailToCustomer(params);
    result.customerConfirmation = true;
    console.info(
      JSON.stringify({
        event: "order_customer_confirmation_email_sent",
        orderId: params.orderId,
        to: params.customerEmail,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: "order_customer_confirmation_email_failed",
        orderId: params.orderId,
        to: params.customerEmail,
        error: message,
      }),
    );
    result.errors.push(`customer_confirmation_failed:${message}`);
  }

  return result;
}

/** Use the authenticated SMTP mailbox as From; department address as Reply-To. */
function buildCustomerMailHeaders(params: {
  replyTo: string;
  senderName?: string;
}): {
  from: string;
  replyTo: string;
} {
  const replyTo = params.replyTo.trim();
  const authenticatedFrom = resolveAuthenticatedSmtpFromAddress() || replyTo;
  const senderName = params.senderName?.trim() || "Boxmag";

  return {
    from: `"${senderName}" <${authenticatedFrom}>`,
    replyTo,
  };
}

type NewsletterLocale = "ro" | "en" | "de";

function resolveNewsletterLocale(locale: string | null | undefined): NewsletterLocale {
  const normalized = (locale ?? "ro").toLowerCase().slice(0, 2);
  if (normalized === "en" || normalized === "de") return normalized;
  return "ro";
}

function newsletterFromAddress(): string {
  return env.contactTo || env.emailFrom;
}

const newsletterWelcomeCopy: Record<
  NewsletterLocale,
  {
    subject: string;
    greeting: string;
    intro: string;
    highlight: string;
    ctaLabel: string;
    footer: string;
    team: string;
  }
> = {
  ro: {
    subject: "Bine ai venit la newsletter-ul Boxmag",
    greeting: "Salut,",
    intro:
      "Iti multumim ca te-ai abonat la newsletter-ul Boxmag. De acum vei primi noutati despre produse, oferte si solutii de ambalare personalizate.",
    highlight:
      "Urmatoarele editii iti vor aduce inspiratie pentru cutii personalizate, tips-uri utile si promotii dedicate abonatilor.",
    ctaLabel: "Exploreaza produsele",
    footer:
      "Daca nu ai solicitat aceasta abonare, ignora acest email sau contacteaza-ne.",
    team: "Echipa Boxmag",
  },
  en: {
    subject: "Welcome to the Boxmag newsletter",
    greeting: "Hello,",
    intro:
      "Thank you for subscribing to the Boxmag newsletter. You will now receive updates about products, offers, and custom packaging solutions.",
    highlight:
      "Upcoming editions will bring inspiration for custom boxes, useful tips, and subscriber-only promotions.",
    ctaLabel: "Explore products",
    footer:
      "If you did not request this subscription, you can ignore this email or contact us.",
    team: "The Boxmag Team",
  },
  de: {
    subject: "Willkommen beim Boxmag Newsletter",
    greeting: "Hallo,",
    intro:
      "Vielen Dank fur Ihr Abonnement des Boxmag Newsletters. Sie erhalten ab sofort Neuigkeiten zu Produkten, Angeboten und individuellen Verpackungslosungen.",
    highlight:
      "In den nachsten Ausgaben erwarten Sie Inspiration fur individuelle Kartons, praktische Tipps und Aktionen nur fur Abonnenten.",
    ctaLabel: "Produkte entdecken",
    footer:
      "Wenn Sie dieses Abonnement nicht angefordert haben, ignorieren Sie diese E-Mail oder kontaktieren Sie uns.",
    team: "Ihr Boxmag Team",
  },
};

export async function sendNewsletterWelcomeEmail(params: {
  to: string;
  locale?: string | null;
}): Promise<void> {
  if (!env.smtpUser || !env.smtpPass) return;

  const from = newsletterFromAddress();
  if (!from) return;

  const locale = resolveNewsletterLocale(params.locale);
  const copy = newsletterWelcomeCopy[locale];
  const shopUrl = env.frontendBaseUrl.replace(/\/$/, "");
  const privacyUrl = `${shopUrl}/privacy-policy`;

  await transporter.sendMail({
    from: `"Boxmag Newsletter" <${from}>`,
    to: params.to,
    subject: copy.subject,
    text: [
      copy.greeting,
      "",
      copy.intro,
      "",
      copy.highlight,
      "",
      `${copy.ctaLabel}: ${shopUrl}`,
      "",
      copy.footer,
      "",
      copy.team,
    ].join("\n"),
    html: `
      <div style="margin:0;background:#f5f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#facc15;padding:18px 24px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;color:#111827;font-weight:700;">${escapeHtml(copy.subject)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                ${escapeHtml(copy.greeting)}
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                ${escapeHtml(copy.intro)}
              </p>

              <div style="margin:0 0 18px;padding:14px 16px;background:#fef9c3;border:1px solid #fde047;border-radius:10px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#713f12;font-weight:600;">
                  ${escapeHtml(copy.highlight)}
                </p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
                <tr>
                  <td style="border-radius:10px;background:#ef6b56;">
                    <a
                      href="${shopUrl}"
                      style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;"
                    >
                      ${escapeHtml(copy.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
                ${escapeHtml(copy.footer)}
              </p>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#374151;">
                ${escapeHtml(copy.team)}
              </p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
                <a href="${privacyUrl}" style="color:#ef6b56;text-decoration:underline;">Privacy policy</a>
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
}

export async function sendVerificationEmail(params: {
  to: string;
  verifyUrl: string;
  expiresMinutes: number;
}): Promise<void> {
  await transporter.sendMail({
    from: env.emailFrom,
    to: params.to,
    subject: "Welcome to Boxmag - Confirm your email",
    text: [
      "Welcome to Boxmag!",
      "",
      "Thanks for creating an account.",
      "Please confirm your email by opening this link:",
      params.verifyUrl,
      "",
      `This link expires in ${params.expiresMinutes} minutes.`,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="margin:0;background:#f5f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#ef6b56;padding:18px 24px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;color:#ffffff;font-weight:700;">Welcome to Boxmag</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                Thanks for creating your account.
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">
                Please confirm your email address to activate your account.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
                <tr>
                  <td style="border-radius:10px;background:#ef6b56;">
                    <a
                      href="${params.verifyUrl}"
                      style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;"
                    >
                      Confirm my email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b7280;">
                This link expires in <strong>${params.expiresMinutes} minutes</strong>.
              </p>

              <div style="margin:14px 0 0;padding:12px;border:1px dashed #d1d5db;border-radius:10px;background:#fafafa;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.02em;color:#6b7280;text-transform:uppercase;">
                  Can't click the button?
                </p>
                <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.5;">
                  <a href="${params.verifyUrl}" style="color:#ef6b56;text-decoration:underline;">
                    ${params.verifyUrl}
                  </a>
                </p>
              </div>

              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </div>
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
  attachmentObjectName?: string | null;
  attachmentUrl?: string | null;
  boxTypeName: string;
  message: string;
  items?: CartLineItem[] | null;
  priceBreakdown?: OrderEmailPriceBreakdown | null;
};

type NodemailerAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

function guessContentTypeFromFileName(fileName: string): string | undefined {
  const ext = fileName.trim().toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return undefined;
  }
}

async function buildEmailAttachments(
  params: NewOrderEmailParams,
): Promise<NodemailerAttachment[]> {
  const objectName = params.attachmentObjectName?.trim();
  if (!objectName) return [];

  const fallbackFileName = "attachment";
  const safeFileName = (params.attachmentName?.trim() || fallbackFileName).slice(0, 180);
  const contentType = guessContentTypeFromFileName(safeFileName);
  try {
    const buffer = await getObjectBufferFromMinio(objectName);
    return [
      {
        filename: safeFileName,
        content: buffer,
        ...(contentType ? { contentType } : {}),
      },
    ];
  } catch (error) {
    console.error(
      `Failed to load attachment from MinIO for email (object=${objectName})`,
      error,
    );
    return [];
  }
}

function buildOrderEmailContent(
  params: NewOrderEmailParams,
  options?: { includeLinePricing?: boolean },
) {
  const includeLinePricing = options?.includeLinePricing ?? true;
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

  const productsTableText = buildProductsTableText(
    lineItems,
    currency,
    includeLinePricing,
  );
  const productsTableHtml = buildProductsTableHtml(
    lineItems,
    currency,
    includeLinePricing,
  );
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

  const isQuoteRequest = params.priceBreakdown == null;
  const quoteRequestNoticeText = isQuoteRequest
    ? "Clientul asteapta o oferta de pret. Te rugam sa ii trimiti oferta cat mai curand posibil."
    : "";
  const quoteRequestNoticeHtml = isQuoteRequest
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#9a3412;font-weight:700;">
          Clientul asteapta o oferta de pret. Te rugam sa ii trimiti oferta cat mai curand posibil.
        </p>
      </div>`
    : "";

  const adminOrderUrl = `${env.frontendBaseUrl.replace(/\/$/, "")}/admin/orders/${params.orderId}`;
  const replyNoticeText =
    "IMPORTANT: Nu raspunde la acest email. Raspunsul catre client trebuie trimis din panoul de administrare al site-ului, din pagina comenzii:\n" +
    adminOrderUrl;
  const replyNoticeHtml = `<div style="margin:32px 0 0;padding:20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;text-align:center;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1e40af;font-weight:700;">
          Nu raspunde la acest email. Raspunsul catre client trebuie trimis din panoul de administrare al site-ului, din pagina comenzii.
        </p>
        <a href="${escapeHtml(adminOrderUrl)}" style="display:inline-block;padding:14px 28px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
          Raspunde din admin
        </a>
      </div>`;

  const recipients = parseNotificationRecipients(env.ordersNotificationTo);
  if (recipients.length === 0) {
    throw new Error("ORDERS_NOTIFICATION_TO is not configured");
  }

  const attachments = await buildEmailAttachments(params);
  const { transport, headers } = getOrderCustomerMailDelivery("Boxmag Comenzi");
  await transport.sendMail({
    ...headers,
    to: recipients.join(", "),
    subject: isQuoteRequest
      ? `Cerere oferta noua ${orderNumber}`
      : `Comanda noua ${orderNumber}`,
    text: [
      isQuoteRequest
        ? "A fost trimisa o cerere noua de oferta in platforma Boxmag."
        : "A fost creata o comanda noua in platforma Boxmag.",
      quoteRequestNoticeText,
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
      "",
      replyNoticeText,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5;max-width:720px;">
        <p style="margin:0 0 16px;">${
          isQuoteRequest
            ? "A fost trimisa o cerere noua de oferta in platforma <strong>Boxmag</strong>."
            : "A fost creata o comanda noua in platforma <strong>Boxmag</strong>."
        }</p>
        ${quoteRequestNoticeHtml}
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
        ${replyNoticeHtml}
      </div>
    `,
    ...(attachments.length > 0 ? { attachments } : {}),
  });
}

export async function sendBusinessOrderConfirmationEmailToCustomer(
  params: NewOrderEmailParams,
): Promise<void> {
  const {
    orderNumber,
    sizeText,
    productsTableText,
    productsTableHtml,
    displayMessage,
  } = buildOrderEmailContent(params, { includeLinePricing: false });

  // Customer confirmations intentionally omit the customer's uploaded file:
  // they already have it, and large attachments risk being dropped after a 250.
  const { transport, headers } = getOrderCustomerMailDelivery();
  await transport.sendMail({
    ...headers,
    to: params.customerEmail,
    subject: `Confirmare cerere oferta ${orderNumber}`,
    text: [
      `Salut ${params.customerName || "client"},`,
      "",
      "Iti multumim pentru cererea de oferta trimisa pe Boxmag.",
      `Numar cerere: ${orderNumber}`,
      "",
      "Am primit configuratia cutiilor tale si o analizam. Vei primi o oferta personalizata in cel mai scurt timp posibil, de obicei in maxim 1-2 zile lucratoare.",
      "",
      "Rezumat cerere:",
      `Tip cutie: ${params.boxTypeName}`,
      `Tip carton: ${params.cardboardType}`,
      `Culoare carton: ${params.cardboardColour}`,
      `Tipar cutie: ${params.boxPrint}`,
      `Dimensiune: ${sizeText}`,
      `Transport: ${params.transport}`,
      `Cantitate: ${params.quantity}`,
      params.attachmentName ? `Atasament: ${params.attachmentName}` : "",
      "",
      "Produse:",
      productsTableText,
      displayMessage ? `\nMesajul tau:\n${displayMessage}` : "",
      "",
      "Daca ai intrebari suplimentare, raspunde la acest email sau contacteaza-ne.",
      "",
      "Cu respect,",
      "Echipa Boxmag",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="margin:0;background:#f5f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:720px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#ef6b56;padding:18px 24px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;color:#ffffff;font-weight:700;">Cererea ta a fost primita</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                Salut ${escapeHtml(params.customerName || "client")},
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                Iti multumim pentru cererea de oferta trimisa pe <strong>Boxmag</strong>.
                Am primit configuratia cutiilor tale si o analizam.
              </p>

              <div style="margin:0 0 18px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#9a3412;font-weight:600;">
                  Vei primi o oferta personalizata in cel mai scurt timp posibil, de obicei in maxim 1-2 zile lucratoare.
                </p>
              </div>

              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">
                Numar cerere
              </p>
              <p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#b91c1c;">${escapeHtml(orderNumber)}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
                <tr><td style="padding:4px 0;color:#6b7280;width:160px;">Tip cutie</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(params.boxTypeName)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Tip carton</td><td style="padding:4px 0;">${escapeHtml(params.cardboardType)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Culoare carton</td><td style="padding:4px 0;">${escapeHtml(params.cardboardColour)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Tipar cutie</td><td style="padding:4px 0;">${escapeHtml(params.boxPrint)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Dimensiune</td><td style="padding:4px 0;">${escapeHtml(sizeText)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Transport</td><td style="padding:4px 0;">${escapeHtml(params.transport)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Cantitate</td><td style="padding:4px 0;font-weight:600;">${params.quantity}</td></tr>
                ${
                  params.attachmentName
                    ? `<tr><td style="padding:4px 0;color:#6b7280;">Atasament</td><td style="padding:4px 0;">${escapeHtml(params.attachmentName)}</td></tr>`
                    : ""
                }
              </table>

              <h3 style="margin:0 0 8px;font-size:15px;color:#111827;">Rezumat produse</h3>
              ${productsTableHtml}
              ${
                displayMessage
                  ? `<div style="margin-top:20px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <p style="margin:0 0 8px;font-weight:700;">Mesajul tau</p>
                <p style="margin:0;white-space:pre-line;">${escapeHtml(displayMessage)}</p>
              </div>`
                  : ""
              }

              <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#374151;">
                Daca ai intrebari suplimentare, raspunde la acest email sau contacteaza-ne.
              </p>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#374151;">
                Cu respect,<br />
                <strong>Echipa Boxmag</strong>
              </p>
            </td>
          </tr>
        </table>
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

  // Customer confirmations intentionally omit the customer's uploaded file.
  const { transport, headers } = getOrderCustomerMailDelivery();
  await transport.sendMail({
    ...headers,
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

export type ContactReplyParams = {
  fromKey: OrderOfferFromKey;
  to: string;
  customerName: string;
  originalMessage: string;
  replyMessage: string;
};

export async function sendContactReplyEmail(
  params: ContactReplyParams,
): Promise<void> {
  if (!isEmailTransportConfigured()) {
    throw new Error("Email transport is not configured");
  }

  const fromAddress = resolveOrderOfferFromAddress(params.fromKey);
  if (!fromAddress) {
    throw new Error("Selected sender address is not configured");
  }

  const replyMessage = params.replyMessage.trim();
  if (!replyMessage) {
    throw new Error("Reply message is empty");
  }

  const originalMessage = params.originalMessage.trim();
  const greetingName = params.customerName.trim() || "client";

  const { transport, headers } = getOfferMailDelivery(params.fromKey);
  await transport.sendMail({
    ...headers,
    to: params.to,
    subject: "Răspuns la mesajul tău - Boxmag",
    text: [
      `Salut ${greetingName},`,
      "",
      replyMessage,
      "",
      originalMessage ? "--- Mesajul tău original ---" : "",
      originalMessage,
      "",
      "Cu respect,",
      "Echipa Boxmag",
    ]
      .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
      .join("\n"),
    html: `
      <div style="margin:0;background:#f5f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#ef6b56;padding:18px 24px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;color:#ffffff;font-weight:700;">Răspuns Boxmag</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                Salut ${escapeHtml(greetingName)},
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;white-space:pre-line;">${escapeHtml(replyMessage)}</p>
              ${
                originalMessage
                  ? `<div style="margin-top:20px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <p style="margin:0 0 8px;font-weight:700;color:#6b7280;font-size:13px;">Mesajul tău original</p>
                <p style="margin:0;white-space:pre-line;color:#4b5563;">${escapeHtml(originalMessage)}</p>
              </div>`
                  : ""
              }
              <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#374151;">
                Cu respect,<br />
                <strong>Echipa Boxmag</strong>
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
}

export type OrderOfferFromKey = "info" | "b2b" | "orders";

export function resolveOrderOfferFromAddress(
  key: OrderOfferFromKey,
): string | null {
  switch (key) {
    case "info":
      return env.infoEmail.trim() || null;
    case "b2b":
      return env.b2bEmail.trim() || null;
    case "orders":
      return env.emailOrdersFrom.trim() || null;
    default:
      return null;
  }
}

export function getOrderOfferSenderOptions(): Array<{
  key: OrderOfferFromKey;
  email: string;
  label: string;
}> {
  const options: Array<{
    key: OrderOfferFromKey;
    email: string;
    label: string;
  }> = [];

  if (env.emailOrdersFrom.trim()) {
    options.push({
      key: "orders",
      email: env.emailOrdersFrom.trim(),
      label: "Orders",
    });
  }
  if (env.infoEmail.trim()) {
    options.push({
      key: "info",
      email: env.infoEmail.trim(),
      label: "Info",
    });
  }
  if (env.b2bEmail.trim()) {
    options.push({
      key: "b2b",
      email: env.b2bEmail.trim(),
      label: "B2B",
    });
  }

  return options;
}

export function resolveDefaultOrderOfferFromKey(
  options: Array<{ key: OrderOfferFromKey }> = getOrderOfferSenderOptions(),
): OrderOfferFromKey {
  const configured = env.emailOfferDefaultFromKey.trim().toLowerCase();
  const allowedKeys: OrderOfferFromKey[] = ["orders", "info", "b2b"];
  const preferred = allowedKeys.includes(configured as OrderOfferFromKey)
    ? (configured as OrderOfferFromKey)
    : "orders";

  if (options.some((option) => option.key === preferred)) {
    return preferred;
  }

  return options[0]?.key ?? "orders";
}

function getOfferMailDelivery(fromKey: OrderOfferFromKey): {
  transport: MailTransporter;
  headers: { from: string; replyTo: string };
} {
  const fromAddress = resolveOrderOfferFromAddress(fromKey);
  if (!fromAddress) {
    throw new Error("Selected sender address is not configured");
  }

  if (fromKey === "orders" && isOrdersMailboxSmtpConfigured()) {
    return {
      transport: getOrdersMailTransporter(),
      headers: buildMailboxHeaders(fromAddress, "Boxmag"),
    };
  }

  if (fromKey === "b2b" && isB2bMailboxSmtpConfigured()) {
    return {
      transport: getB2bMailTransporter(),
      headers: buildMailboxHeaders(fromAddress, "Boxmag"),
    };
  }

  if (fromKey === "info") {
    return {
      transport: transporter,
      headers: buildMailboxHeaders(fromAddress, "Boxmag"),
    };
  }

  return {
    transport: transporter,
    headers: buildCustomerMailHeaders({
      replyTo: fromAddress,
      senderName: "Boxmag",
    }),
  };
}

export async function sendOrderOfferEmailToCustomer(
  params: NewOrderEmailParams & {
    fromKey: OrderOfferFromKey;
    offerMessage?: string | null;
  },
): Promise<void> {
  if (!isOrderEmailTransportConfigured()) {
    throw new Error("Email transport is not configured");
  }

  const fromAddress = resolveOrderOfferFromAddress(params.fromKey);
  if (!fromAddress) {
    throw new Error("Selected sender address is not configured");
  }

  const {
    orderNumber,
    sizeText,
    productsTableText,
    productsTableHtml,
    priceBreakdownText,
    priceBreakdownHtml,
    displayMessage,
  } = buildOrderEmailContent(params);

  const offerMessage = params.offerMessage?.trim() ?? "";
  const defaultOfferText =
    "Va transmitem oferta pentru cererea dumneavoastra. Mai jos regasiti detaliile comenzii.";

  const { transport, headers } = getOfferMailDelivery(params.fromKey);
  await transport.sendMail({
    ...headers,
    to: params.customerEmail,
    subject: `Oferta ${orderNumber}`,
    text: [
      `Salut ${params.customerName || "client"},`,
      "",
      offerMessage || defaultOfferText,
      "",
      `Numar comanda: ${orderNumber}`,
      `Companie: ${params.companyName || "—"}`,
      `Tip cutie: ${params.boxTypeName}`,
      `Tip carton: ${params.cardboardType}`,
      `Culoare carton: ${params.cardboardColour}`,
      `Tipar cutie: ${params.boxPrint}`,
      `Dimensiune: ${sizeText}`,
      `Transport: ${params.transport}`,
      `Cantitate: ${params.quantity}`,
      "",
      "Produse:",
      productsTableText,
      priceBreakdownText ? `\n${priceBreakdownText}` : "",
      displayMessage ? `\nMesaj client:\n${displayMessage}` : "",
      "",
      "Cu respect,",
      "Echipa Boxmag",
    ]
      .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
      .join("\n"),
    html: `
      <div style="margin:0;background:#f5f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:720px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#ef6b56;padding:18px 24px;">
              <h1 style="margin:0;font-size:20px;line-height:1.3;color:#ffffff;font-weight:700;">Oferta ${escapeHtml(orderNumber)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
                Salut ${escapeHtml(params.customerName || "client")},
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;white-space:pre-line;">
                ${escapeHtml(offerMessage || defaultOfferText)}
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;">
                <tr><td style="padding:4px 0;color:#6b7280;width:160px;">Numar comanda</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(orderNumber)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Companie</td><td style="padding:4px 0;">${escapeHtml(params.companyName || "—")}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Tip cutie</td><td style="padding:4px 0;">${escapeHtml(params.boxTypeName)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Tip carton</td><td style="padding:4px 0;">${escapeHtml(params.cardboardType)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Culoare carton</td><td style="padding:4px 0;">${escapeHtml(params.cardboardColour)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Tipar cutie</td><td style="padding:4px 0;">${escapeHtml(params.boxPrint)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Dimensiune</td><td style="padding:4px 0;">${escapeHtml(sizeText)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Transport</td><td style="padding:4px 0;">${escapeHtml(params.transport)}</td></tr>
                <tr><td style="padding:4px 0;color:#6b7280;">Cantitate</td><td style="padding:4px 0;font-weight:600;">${params.quantity}</td></tr>
              </table>

              <h3 style="margin:0 0 8px;font-size:15px;color:#111827;">Produse</h3>
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

              <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#374151;">
                Cu respect,<br />
                <strong>Echipa Boxmag</strong>
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
}
