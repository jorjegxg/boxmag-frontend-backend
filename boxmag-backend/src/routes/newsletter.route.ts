import { Router } from "express";
import { ResultSetHeader } from "mysql2";
import { mysqlPool } from "../db/mysql";

type SubscribeNewsletterPayload = {
  email?: unknown;
  consent?: unknown;
  locale?: unknown;
  source?: unknown;
};

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const newsletterRouter = Router();

newsletterRouter.post("/subscribe", async (req, res) => {
  const payload = (req.body ?? {}) as SubscribeNewsletterPayload;
  const emailRaw = toOptionalString(payload.email);
  const localeRaw = toOptionalString(payload.locale);
  const sourceRaw = toOptionalString(payload.source);

  if (!emailRaw || payload.consent !== true) {
    res.status(400).json({
      ok: false,
      message: "Invalid newsletter payload",
    });
    return;
  }

  const normalizedEmail = emailRaw.toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({
      ok: false,
      message: "Invalid email address",
    });
    return;
  }

  const locale = localeRaw ? localeRaw.slice(0, 10) : null;
  const source = sourceRaw ? sourceRaw.slice(0, 120) : "website-footer";

  try {
    await mysqlPool.execute<ResultSetHeader>(
      `INSERT INTO newsletter_subscribers (email, consent, locale, source)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         consent = VALUES(consent),
         locale = VALUES(locale),
         source = VALUES(source),
         updated_at = CURRENT_TIMESTAMP`,
      [normalizedEmail, 1, locale, source]
    );

    res.status(201).json({
      ok: true,
      data: {
        email: normalizedEmail,
      },
    });
  } catch (error) {
    console.error("Failed to subscribe newsletter", error);
    res.status(500).json({
      ok: false,
      message: "Failed to subscribe newsletter",
    });
  }
});
