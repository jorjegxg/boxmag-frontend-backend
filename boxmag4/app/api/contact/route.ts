import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { checkVAT, countries } from "jsvat";

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

    await transporter.sendMail({
      from: `"Boxmag Contact Form" <${contactTo}>`,
      to: contactTo,
      replyTo: body.email,
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
      ].join("\n"),
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
