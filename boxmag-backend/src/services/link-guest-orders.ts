import { ResultSetHeader } from "mysql2";
import { mysqlPool } from "../db/mysql";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function linkGuestOrdersToUser(
  userId: number,
  email: string,
): Promise<number> {
  if (!Number.isInteger(userId) || userId <= 0) {
    return 0;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return 0;
  }

  const [result] = await mysqlPool.execute<ResultSetHeader>(
    `UPDATE orders o
     INNER JOIN contacts c ON c.order_id = o.id
     SET o.user_id = ?
     WHERE o.user_id IS NULL AND LOWER(c.email) = ?`,
    [userId, normalizedEmail],
  );

  return result.affectedRows ?? 0;
}
