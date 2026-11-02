import { Router, type Request } from "express";
import { ResultSetHeader } from "mysql2";
import { mysqlPool } from "../db/mysql";
import { sendNewsletterWelcomeEmail } from "../services/email";
import { isNewsletterUnsubscribeTokenValid } from "../services/newsletter-token";

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
         unsubscribed_at = NULL,
         locale = VALUES(locale),
         source = VALUES(source),
         updated_at = CURRENT_TIMESTAMP`,
      [normalizedEmail, 1, locale, source]
    );

    try {
      await sendNewsletterWelcomeEmail({
        to: normalizedEmail,
        locale,
      });
    } catch (emailError) {
      console.error("Failed to send newsletter welcome email", emailError);
    }

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

function readParam(req: Request, key: "email" | "token"): string | null {
  const fromQuery = req.query[key];
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim();
  const body = (req.body ?? {}) as Record<string, unknown>;
  return toOptionalString(body[key]);
}

/**
 * Unsubscribe via the signed link from our emails. Accepts JSON body (frontend
 * page) or query params (RFC 8058 one-click `List-Unsubscribe-Post`). Answers
 * `ok` for unknown emails too, so the endpoint does not reveal subscribers.
 */
newsletterRouter.post("/unsubscribe", async (req, res) => {
  const email = readParam(req, "email")?.toLowerCase() ?? null;
  const token = readParam(req, "token");

  if (!email || !token || !isNewsletterUnsubscribeTokenValid(email, token)) {
    res.status(400).json({
      ok: false,
      message: "Invalid unsubscribe link",
    });
    return;
  }

  try {
    await mysqlPool.execute<ResultSetHeader>(
      `UPDATE newsletter_subscribers
       SET consent = 0,
           unsubscribed_at = COALESCE(unsubscribed_at, CURRENT_TIMESTAMP)
       WHERE email = ?`,
      [email],
    );
    res.json({ ok: true, data: { email } });
  } catch (error) {
    console.error("Failed to unsubscribe newsletter", error);
    res.status(500).json({
      ok: false,
      message: "Failed to unsubscribe newsletter",
    });
  }
});
