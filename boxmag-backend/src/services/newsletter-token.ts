import crypto from "crypto";
import { env } from "../config/env";
import { getUserSessionSecret, safeEqualStrings } from "../config/user-auth";

const NEWSLETTER_TOKEN_SALT = "boxmag-newsletter-unsubscribe-v1";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Stateless unsubscribe token: HMAC of the email. Works for every email we
 * send (welcome + future campaigns) without storing per-subscriber secrets.
 */
export function createNewsletterUnsubscribeToken(email: string): string | null {
  const secret = getUserSessionSecret();
  const normalized = normalizeEmail(email);
  if (!secret || !normalized) return null;
  return crypto
    .createHmac("sha256", secret)
    .update(`${NEWSLETTER_TOKEN_SALT}:${normalized}`)
    .digest("hex");
}

export function isNewsletterUnsubscribeTokenValid(
  email: string,
  token: string,
): boolean {
  const expected = createNewsletterUnsubscribeToken(email);
  if (!expected || !token) return false;
  return safeEqualStrings(token, expected);
}

/** Link shown in emails; the frontend page confirms and calls the API. */
export function buildNewsletterUnsubscribeUrl(email: string): string | null {
  const token = createNewsletterUnsubscribeToken(email);
  if (!token) return null;
  const params = new URLSearchParams({ email: normalizeEmail(email), token });
  return `${env.frontendBaseUrl.replace(/\/$/, "")}/newsletter/unsubscribe?${params}`;
}

/** RFC 8058 one-click target for the `List-Unsubscribe` header. */
export function buildNewsletterOneClickUnsubscribeUrl(email: string): string | null {
  const token = createNewsletterUnsubscribeToken(email);
  if (!token) return null;
  const params = new URLSearchParams({ email: normalizeEmail(email), token });
  return `${env.backendPublicUrl.replace(/\/$/, "")}/api/newsletter/unsubscribe?${params}`;
}
