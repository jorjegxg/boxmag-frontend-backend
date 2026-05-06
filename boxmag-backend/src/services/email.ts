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
