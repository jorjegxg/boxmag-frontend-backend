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
  quantity: number;
  boxTypeName: string;
  message: string;
}): Promise<void> {
  const orderNumber = `ORD-${String(params.orderId).padStart(4, "0")}`;
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
      `Box type: ${params.boxTypeName}`,
      `Cantitate: ${params.quantity}`,
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
        <li><strong>Box type:</strong> ${params.boxTypeName}</li>
        <li><strong>Cantitate:</strong> ${params.quantity}</li>
      </ul>
      <p><strong>Mesaj client:</strong></p>
      <p>${params.message.replace(/\n/g, "<br/>")}</p>
    `,
  });
}
