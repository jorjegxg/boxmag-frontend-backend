import type { RowDataPacket } from "mysql2";
import { credentialStampFromPasswordHash } from "../config/user-auth";
import { mysqlPool } from "../db/mysql";

type CredentialRow = RowDataPacket & { password_hash: string };

/**
 * Current credential stamp for an active user, or null when the user does not
 * exist / is inactive. Session cookies are signed over this stamp, so a
 * password change (reset) or account deactivation invalidates old sessions.
 */
export async function getUserCredentialStamp(
  userId: number,
): Promise<string | null> {
  const [rows] = await mysqlPool.execute<CredentialRow[]>(
    `SELECT password_hash FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
    [userId],
  );
  const passwordHash = rows[0]?.password_hash;
  if (typeof passwordHash !== "string" || !passwordHash) return null;
  return credentialStampFromPasswordHash(passwordHash);
}
