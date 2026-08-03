import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { checkVAT, countries } from "jsvat";
import { getBackendBaseUrl } from "../../../lib/backend-url";

type ContactPayload = {
  firstName: string;
  surname: string;
  companyName: string;
  vatNumber: string;
  email: string;
  phone: string;
  country: string;
  message: string;
  acceptTerms: boolean;
  fileName?: string;
};

const MAX_ATTACHMENT_MB = 10;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
/** Cap total attachment payload so concurrent contact submits cannot OOM the Node process. */
const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const rootEnvPath = path.resolve(process.cwd(), "../.env");
const rootEnv =
  fs.existsSync(rootEnvPath)
    ? Object.fromEntries(
        fs
          .readFileSync(rootEnvPath, "utf8")
          .split(/\r?\n/)
          .filter((line) => line.trim() && !line.trim().startsWith("#"))
          .map((line) => {
            const separatorIndex = line.indexOf("=");
            if (separatorIndex < 0) return [line.trim(), ""];
            const key = line.slice(0, separatorIndex).trim();
            const value = line.slice(separatorIndex + 1).trim();
            return [key, value];
          }),
      )
    : {};

function envValue(key: string): string | undefined {
  const value = process.env[key] ?? rootEnv[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Public site origin, used to link admins to the message in the admin panel. */
function getSiteBaseUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    envValue("NEXT_PUBLIC_SITE_URL") ??
    envValue("FRONTEND_BASE_URL");
  const normalized = value?.replace(/\/$/, "");
  if (normalized && normalized.length > 0) return normalized;
  return process.env.NODE_ENV === "production"
    ? "https://boxmag.eu"
    : "http://localhost:3006";
}

/**
 * Persist the submission so it shows up in the admin panel. Best-effort.
 * Returns the created message id when the backend reports one.
 */
async function persistContactMessage(body: ContactPayload): Promise<number | null> {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: body.firstName,
        surname: body.surname,
        companyName: body.companyName,
        vatNumber: body.vatNumber,
        email: body.email,
        phone: body.phone,
        country: body.country,
        message: body.message,
        attachmentNames: body.fileName ?? "",
      }),
    });
    const payload = (await response.json()) as {
      data?: { id?: number };
    };
    const id = payload?.data?.id;
    return typeof id === "number" ? id : null;
  } catch (error) {
    console.error("Failed to persist contact message to backend", error);
    return null;
  }
}

let sharedTransporter: nodemailer.Transporter | null = null;

function getTransporter(smtpHost: string, smtpPort: number, smtpUser: string, smtpPass: string) {
  if (!sharedTransporter) {
    sharedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }
  return sharedTransporter;
}

function isNonEmpty(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request): Promise<Response> {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let body: ContactPayload;
    let attachmentFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      attachmentFiles = formData
        .getAll("attachment")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
      body = {
        firstName: String(formData.get("firstName") ?? ""),
        surname: String(formData.get("surname") ?? ""),
        companyName: String(formData.get("companyName") ?? ""),
        vatNumber: String(formData.get("vatNumber") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        country: String(formData.get("country") ?? ""),
        message: String(formData.get("message") ?? ""),
        acceptTerms: String(formData.get("acceptTerms") ?? "") === "true",
        fileName: attachmentFiles.map((file) => file.name).join(", "),
      };
    } else {
      body = (await req.json()) as ContactPayload;
    }
    const requiredFields: Array<keyof ContactPayload> = [
      "firstName",
      "surname",
      "companyName",
      "email",
      "phone",
      "country",
      "vatNumber",
      "message",
    ];

    for (const key of requiredFields) {
      const value = body[key];
      if (typeof value !== "string" || !isNonEmpty(value)) {
        return Response.json(
          { message: `Missing required field: ${key}` },
          { status: 400 },
        );
      }
    }

    if (!body.acceptTerms) {
      return Response.json(
        { message: "Terms must be accepted." },
        { status: 400 },
      );
    }

    if (attachmentFiles.length > MAX_ATTACHMENTS) {
      return Response.json(
        { message: `You can upload up to ${MAX_ATTACHMENTS} files.` },
        { status: 400 },
      );
    }

    const oversizedFile = attachmentFiles.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (oversizedFile) {
      return Response.json(
        {
          message: `File "${oversizedFile.name}" is too large. Maximum allowed size is ${MAX_ATTACHMENT_MB} MB per file.`,
        },
        { status: 400 },
      );
    }

    const totalAttachmentBytes = attachmentFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return Response.json(
        {
          message: `Total attachments are too large. Maximum combined size is ${Math.floor(MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024))} MB.`,
        },
        { status: 400 },
      );
    }

    const normalizedVat = body.vatNumber.trim().toUpperCase().replace(/\s+/g, "");
    const vatCheck = checkVAT(normalizedVat, countries);
    if (!vatCheck.isValid && !vatCheck.isValidFormat) {
      return Response.json(
        {
          message:
            "Invalid VAT number. Please provide a valid VAT for the selected country (e.g. RO12345678).",
        },
        { status: 400 },
      );
    }

    const smtpHost = envValue("SMTP_HOST") ?? "smtp.gmail.com";
    const smtpPort = Number(envValue("SMTP_PORT") ?? 587);
    const smtpUser = envValue("SMTP_USER");
    const smtpPass = envValue("SMTP_PASS");
    const contactTo = envValue("CONTACT_TO");

    if (!smtpUser || !smtpPass || !contactTo) {
      return Response.json(
        { message: "SMTP is not configured. Set SMTP_USER, SMTP_PASS, CONTACT_TO." },
        { status: 500 },
      );
    }

    const transporter = getTransporter(smtpHost, smtpPort, smtpUser, smtpPass);

    const attachments = [];
    for (const attachmentFile of attachmentFiles) {
      const bytes = Buffer.from(await attachmentFile.arrayBuffer());
      attachments.push({
        filename: attachmentFile.name,
        content: bytes,
        contentType: attachmentFile.type || undefined,
      });
    }

    // Persist first so the notification email can link straight to the message.
    const messageId = await persistContactMessage(body);
    const adminMessagesUrl = messageId
      ? `${getSiteBaseUrl()}/admin/messages/${messageId}`
      : `${getSiteBaseUrl()}/admin/messages`;

    const replyNotice =
      "Nu raspunde direct la acest email. Raspunsul se trimite de pe website, din panoul de administrare:";

    await transporter.sendMail({
      from: `"Boxmag Contact Form" <${contactTo}>`,
      to: contactTo,
      subject: `New contact request from ${body.firstName} ${body.surname}`,
      text: [
        `First Name: ${body.firstName}`,
        `Surname: ${body.surname}`,
        `Company Name: ${body.companyName || "-"}`,
        `VAT Number: ${body.vatNumber || "-"}`,
        `Email: ${body.email}`,
        `Phone: ${body.phone}`,
        `Country: ${body.country}`,
        `Attachments: ${body.fileName || "-"}`,
        "",
        "Message:",
        body.message,
        "",
        "---",
        replyNotice,
        adminMessagesUrl,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5;max-width:640px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
            <tr><td style="padding:4px 0;color:#6b7280;width:150px;">First Name</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(body.firstName)}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Surname</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(body.surname)}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Company Name</td><td style="padding:4px 0;">${escapeHtml(body.companyName || "-")}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">VAT Number</td><td style="padding:4px 0;">${escapeHtml(body.vatNumber || "-")}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Email</td><td style="padding:4px 0;">${escapeHtml(body.email)}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Phone</td><td style="padding:4px 0;">${escapeHtml(body.phone)}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Country</td><td style="padding:4px 0;">${escapeHtml(body.country)}</td></tr>
            <tr><td style="padding:4px 0;color:#6b7280;">Attachments</td><td style="padding:4px 0;">${escapeHtml(body.fileName || "-")}</td></tr>
          </table>
          <div style="margin:0 0 16px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
            <p style="margin:0 0 8px;font-weight:700;">Message</p>
            <p style="margin:0;white-space:pre-line;">${escapeHtml(body.message)}</p>
          </div>
          <div style="margin:0;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;">
            <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#9a3412;font-weight:700;">
              ${replyNotice}
            </p>
            <a href="${adminMessagesUrl}" style="display:inline-block;padding:10px 18px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;background:#ef6b56;border-radius:8px;">
              Raspunde din panou
            </a>
          </div>
        </div>
      `,
      attachments,
    });

    return Response.json({ message: "Message sent successfully." }, { status: 200 });
  } catch {
    return Response.json(
      { message: "Unable to send your message right now." },
      { status: 500 },
    );
  }
}
