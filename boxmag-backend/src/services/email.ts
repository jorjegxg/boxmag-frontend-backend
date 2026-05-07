import nodemailer from "nodemailer";
import { env } from "../config/env";

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

export async function sendNewOrderNotificationEmail(params: {
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
}): Promise<void> {
  const orderNumber = `ORD-${String(params.orderId).padStart(4, "0")}`;
  const sizeText =
    params.lengthMm != null && params.widthMm != null && params.heightMm != null
      ? `${params.lengthMm} x ${params.widthMm} x ${params.heightMm} mm (${params.sizeType})`
      : `N/A (${params.sizeType})`;
  const yesNo = (value: boolean) => (value ? "Da" : "Nu");
  const attachmentText = params.attachmentName ?? "N/A";
  const vatText = params.vatNumber ?? "N/A";
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
      `Cantitate: ${params.quantity}`,
      `FTL: ${yesNo(params.ftl)}`,
      `Attachment: ${attachmentText}`,
      "",
      "Mesaj client:",
      params.message,
    ].join("\n"),
    html: `
      <p>A fost creata o comanda noua in platforma <strong>Boxmag</strong>.</p>
      <ul>
        <li><strong>Numar comanda:</strong> ${orderNumber}</li>
        <li><strong>Client:</strong> ${params.customerName}</li>
        <li><strong>Companie:</strong> ${params.companyName}</li>
        <li><strong>Email client:</strong> ${params.customerEmail}</li>
        <li><strong>Telefon:</strong> ${params.customerPhone}</li>
        <li><strong>Adresa:</strong> ${params.customerAddress}</li>
        <li><strong>Cod postal:</strong> ${params.customerPostcode}</li>
        <li><strong>Oras:</strong> ${params.customerCity}</li>
        <li><strong>Tara:</strong> ${params.customerCountry}</li>
        <li><strong>TVA:</strong> ${vatText}</li>
        <li><strong>Creeaza cont:</strong> ${yesNo(params.createAccount)}</li>
        <li><strong>Consimtamant telefon:</strong> ${yesNo(params.consentPhone)}</li>
        <li><strong>Consimtamant email:</strong> ${yesNo(params.consentEmail)}</li>
        <li><strong>Box type:</strong> ${params.boxTypeName}</li>
        <li><strong>Cardboard type:</strong> ${params.cardboardType}</li>
        <li><strong>Cardboard colour:</strong> ${params.cardboardColour}</li>
        <li><strong>Box print:</strong> ${params.boxPrint}</li>
        <li><strong>Dimensiune:</strong> ${sizeText}</li>
        <li><strong>Transport:</strong> ${params.transport}</li>
        <li><strong>Cantitate:</strong> ${params.quantity}</li>
        <li><strong>FTL:</strong> ${yesNo(params.ftl)}</li>
        <li><strong>Attachment:</strong> ${attachmentText}</li>
      </ul>
      <p><strong>Mesaj client:</strong></p>
      <p>${params.message.replace(/\n/g, "<br/>")}</p>
    `,
  });
}
