import { Router, type Request } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";
import { requireAdmin } from "../middleware/require-admin";
import {
  buildLikeSearch,
  buildListMeta,
  buildWhereSql,
  readPagination,
  readQueryString,
} from "../utils/list-query";
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

type SubscriberRow = RowDataPacket & {
  id: number;
  email: string;
  consent: number;
  locale: string | null;
  source: string | null;
  unsubscribed_at: Date | string | null;
  created_at: Date | string;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** RFC 4180 field; also defuses spreadsheet formula injection (=, +, -, @). */
function csvField(value: string | number | null): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Admin: newsletter subscribers. Optional `q` (email), `status`
 * (`subscribed` / `unsubscribed`), `page` / `pageSize`; `format=csv` exports
 * every matching row.
 */
newsletterRouter.get("/subscribers", requireAdmin, async (req, res) => {
  const query = req.query as Record<string, unknown>;
  const clauses: string[] = [];
  const params: unknown[] = [];

  const status = readQueryString(query.status);
  if (status === "subscribed") clauses.push("consent = 1");
  if (status === "unsubscribed") clauses.push("consent = 0");

  const like = buildLikeSearch(query.q);
  if (like) {
    clauses.push("LOWER(email) LIKE ?");
    params.push(like);
  }

  const whereSql = buildWhereSql(clauses);
  const isCsv = readQueryString(query.format) === "csv";
  const pagination = isCsv ? null : readPagination(query);

  try {
    const [rows] = await mysqlPool.query<SubscriberRow[]>(
      `SELECT id, email, consent, locale, source, unsubscribed_at, created_at
       FROM newsletter_subscribers
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       ${pagination ? "LIMIT ? OFFSET ?" : ""}`,
      pagination ? [...params, pagination.pageSize, pagination.offset] : params,
    );

    const data = rows.map((row) => ({
      id: row.id,
      email: row.email,
      subscribed: row.consent === 1,
      locale: row.locale,
      source: row.source,
      unsubscribedAt: toIso(row.unsubscribed_at),
      createdAt: toIso(row.created_at),
    }));

    if (isCsv) {
      const lines = [
        ["email", "subscribed", "locale", "source", "created_at", "unsubscribed_at"].join(","),
        ...data.map((row) =>
          [
            row.email,
            row.subscribed ? "yes" : "no",
            row.locale,
            row.source,
            row.createdAt,
            row.unsubscribedAt,
          ]
            .map(csvField)
            .join(","),
        ),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="newsletter-subscribers.csv"',
      );
      res.send(`\uFEFF${lines.join("\r\n")}\r\n`);
      return;
    }

    let total = rows.length;
    if (pagination) {
      const [countRows] = await mysqlPool.query<Array<RowDataPacket & { total: number }>>(
        `SELECT COUNT(*) AS total FROM newsletter_subscribers ${whereSql}`,
        params,
      );
      total = Number(countRows[0]?.total ?? 0);
    }

    res.json({ ok: true, data, meta: buildListMeta(pagination, total) });
  } catch (error) {
    console.error("Failed to load newsletter subscribers", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load newsletter subscribers",
    });
  }
});
