import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { mysqlPool } from "../db/mysql";
import { requireAdmin } from "../middleware/require-admin";
import {
  buildLikeSearch,
  buildListMeta,
  buildWhereSql,
  readPagination,
} from "../utils/list-query";

type CustomerRow = RowDataPacket & {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  vat_number: string | null;
  phone: string | null;
  is_active: number;
  email_verified_at: Date | string | null;
  last_login_at: Date | string | null;
  created_at: Date | string;
  orders_count: number;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export const customersRouter = Router();

/**
 * Admin: registered customer accounts (never password / token columns).
 * Optional `q` (email / name / company / VAT) and `page` / `pageSize`.
 */
customersRouter.get("/", requireAdmin, async (req, res) => {
  const query = req.query as Record<string, unknown>;
  const clauses: string[] = [];
  const params: unknown[] = [];

  const like = buildLikeSearch(query.q);
  if (like) {
    clauses.push(`(LOWER(u.email) LIKE ?
              OR LOWER(CONCAT_WS(' ', u.first_name, u.last_name)) LIKE ?
              OR LOWER(u.company_name) LIKE ?
              OR LOWER(u.vat_number) LIKE ?)`);
    params.push(like, like, like, like);
  }

  const whereSql = buildWhereSql(clauses);
  const pagination = readPagination(query);

  try {
    const [rows] = await mysqlPool.query<CustomerRow[]>(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.company_name, u.vat_number,
              u.phone, u.is_active, u.email_verified_at, u.last_login_at, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
       FROM users u
       ${whereSql}
       ORDER BY u.created_at DESC, u.id DESC
       ${pagination ? "LIMIT ? OFFSET ?" : ""}`,
      pagination ? [...params, pagination.pageSize, pagination.offset] : params,
    );

    let total = rows.length;
    if (pagination) {
      const [countRows] = await mysqlPool.query<Array<RowDataPacket & { total: number }>>(
        `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
        params,
      );
      total = Number(countRows[0]?.total ?? 0);
    }

    res.json({
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name ?? "",
        lastName: row.last_name ?? "",
        companyName: row.company_name ?? "",
        vatNumber: row.vat_number ?? "",
        phone: row.phone ?? "",
        isActive: row.is_active === 1,
        emailVerifiedAt: toIso(row.email_verified_at),
        lastLoginAt: toIso(row.last_login_at),
        createdAt: toIso(row.created_at),
        ordersCount: Number(row.orders_count ?? 0),
      })),
      meta: buildListMeta(pagination, total),
    });
  } catch (error) {
    console.error("Failed to load customers", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load customers",
    });
  }
});
