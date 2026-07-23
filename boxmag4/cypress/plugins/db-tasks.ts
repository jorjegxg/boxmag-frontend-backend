import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { readRootEnvValue } from "../../lib/root-env";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const SEED_SQL_PATH = path.join(
  REPO_ROOT,
  "boxmag-backend/db/reset_and_seed.sql",
);
const SEED_MINIO_SCRIPT_PATH = path.join(
  REPO_ROOT,
  "boxmag-backend/db/seed_minio_images.js",
);

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

function envValue(key: string, fallback = ""): string {
  return process.env[key] ?? readRootEnvValue(key) ?? fallback;
}

function getDbConfig(): DbConfig {
  return {
    host: envValue("DB_HOST", "localhost"),
    port: Number(envValue("DB_PORT", "3307")),
    user: envValue("DB_USER", "boxmag4"),
    password: envValue("DB_PASSWORD", envValue("MYSQL_PASSWORD", "")),
    database: envValue("DB_NAME", envValue("MYSQL_DATABASE", "boxmag4")),
  };
}

async function withConnection<T>(
  run: (connection: import("mysql2/promise").Connection) => Promise<T>,
  options: { multipleStatements?: boolean } = {},
): Promise<T> {
  const mysql = require(path.resolve(
    REPO_ROOT,
    "boxmag-backend/node_modules/mysql2/promise",
  )) as typeof import("mysql2/promise");

  const connection = await mysql.createConnection({
    ...getDbConfig(),
    multipleStatements: options.multipleStatements ?? false,
  });
  try {
    return await run(connection);
  } finally {
    await connection.end();
  }
}

export async function resetDatabaseForTests(): Promise<null> {
  if (!fs.existsSync(SEED_SQL_PATH)) {
    throw new Error(`Seed SQL file not found: ${SEED_SQL_PATH}`);
  }

  const sql = fs.readFileSync(SEED_SQL_PATH, "utf8");
  console.log("[cypress] Resetting MySQL from reset_and_seed.sql...");

  await withConnection(
    async (connection) => {
      await connection.query(sql);
    },
    { multipleStatements: true },
  );

  if (!fs.existsSync(SEED_MINIO_SCRIPT_PATH)) {
    console.warn(
      `[cypress] MinIO seed script not found at ${SEED_MINIO_SCRIPT_PATH}; skipping image upload.`,
    );
    return null;
  }

  console.log("[cypress] Seeding MinIO box images...");
  const result = spawnSync(process.execPath, [SEED_MINIO_SCRIPT_PATH, "--purge"], {
    cwd: path.join(REPO_ROOT, "boxmag-backend"),
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`MinIO seed failed (exit ${result.status ?? "unknown"}).\n${details}`);
  }

  console.log("[cypress] Database reset complete.");
  return null;
}

export async function resetB2bGuestUser(email: string): Promise<null> {
  const normalizedEmail = email.trim().toLowerCase();
  await withConnection(async (connection) => {
    await connection.execute(
      "DELETE FROM pending_user_registrations WHERE email = ?",
      [normalizedEmail],
    );
    await connection.execute("DELETE FROM users WHERE email = ?", [
      normalizedEmail,
    ]);
  });
  return null;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function ensurePendingRegistrationForTest(options: {
  email: string;
  password: string;
  token: string;
  firstName: string;
  surname: string;
  companyName: string;
  vatNumber: string;
  phone: string;
}): Promise<null> {
  const normalizedEmail = options.email.trim().toLowerCase();
  const tokenHash = crypto
    .createHash("sha256")
    .update(options.token)
    .digest("hex");
  const passwordHash = hashPassword(options.password);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await withConnection(async (connection) => {
    await connection.execute(
      `INSERT INTO pending_user_registrations
        (email, password_hash, first_name, last_name, company_name, vat_number, phone,
         verification_token_hash, verification_expires_at, accepted_terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         first_name = VALUES(first_name),
         last_name = VALUES(last_name),
         company_name = VALUES(company_name),
         vat_number = VALUES(vat_number),
         phone = VALUES(phone),
         verification_token_hash = VALUES(verification_token_hash),
         verification_expires_at = VALUES(verification_expires_at),
         accepted_terms = VALUES(accepted_terms)`,
      [
        normalizedEmail,
        passwordHash,
        options.firstName,
        options.surname,
        options.companyName,
        options.vatNumber,
        options.phone,
        tokenHash,
        expiresAt,
      ],
    );
  });

  return null;
}

export async function setEmailVerificationToken(options: {
  email: string;
  token: string;
}): Promise<null> {
  const normalizedEmail = options.email.trim().toLowerCase();
  const tokenHash = crypto
    .createHash("sha256")
    .update(options.token)
    .digest("hex");

  await withConnection(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT id FROM pending_user_registrations WHERE email = ? LIMIT 1`,
      [normalizedEmail],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        `No pending registration found for ${normalizedEmail}. Register first.`,
      );
    }

    await connection.execute(
      `UPDATE pending_user_registrations
       SET verification_token_hash = ?,
           verification_expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)
       WHERE email = ?`,
      [tokenHash, normalizedEmail],
    );
  });

  return null;
}

/** Assert backend log shows order notification email was sent (includes orders@ when configured). */
export function assertOrderNotificationEmailLog(options: {
  orderId: number;
  mustIncludeRecipient?: string;
}): null {
  const orderId = Number(options.orderId);
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error(`Invalid orderId for email log check: ${options.orderId}`);
  }

  const mustInclude =
    options.mustIncludeRecipient?.trim().toLowerCase() ||
    envValue("ORDERS_NOTIFICATION_TO", "orders@boxmag.eu")
      .split(/[,;]+/)
      .map((part) => part.trim().toLowerCase())
      .find((part) => part.includes("orders@")) ||
    "orders@boxmag.eu";

  const logs = readBackendContainerLogs(200);
  const needle = `"event":"order_notification_email_sent","orderId":${orderId}`;
  const matchingLines = logs
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(needle));

  if (matchingLines.length === 0) {
    throw new Error(
      `No order_notification_email_sent log found for orderId=${orderId}. Backend may not have sent the internal notification.`,
    );
  }

  const line = matchingLines[matchingLines.length - 1]!;
  if (!line.toLowerCase().includes(mustInclude)) {
    throw new Error(
      `Notification log for orderId=${orderId} does not include recipient ${mustInclude}. Log: ${line}`,
    );
  }

  return null;
}

function readBackendContainerLogs(tail: number): string {
  const dockerResult = spawnSync(
    "docker",
    ["logs", "boxmag4-backend", "--tail", String(tail)],
    { encoding: "utf8", cwd: REPO_ROOT },
  );
  if (!dockerResult.error && dockerResult.status === 0) {
    return `${dockerResult.stdout ?? ""}\n${dockerResult.stderr ?? ""}`;
  }

  // Fallback for Cypress-in-Docker: Node HTTP over the mounted docker.sock
  const nodeRead = spawnSync(
    "node",
    [
      "-e",
      `
const http = require('http');
const chunks = [];
const req = http.request({
  socketPath: '/var/run/docker.sock',
  path: '/containers/boxmag4-backend/logs?stdout=1&stderr=1&tail=${tail}',
  method: 'GET',
}, (res) => {
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    let out = '';
    let i = 0;
    while (i + 8 <= buf.length) {
      const size = buf.readUInt32BE(i + 4);
      const start = i + 8;
      const end = start + size;
      if (end > buf.length) break;
      out += buf.slice(start, end).toString('utf8');
      i = end;
    }
    if (!out) out = buf.toString('utf8');
    process.stdout.write(out);
  });
});
req.on('error', (e) => { console.error(e.message); process.exit(1); });
req.end();
`,
    ],
    { encoding: "utf8" },
  );

  if (nodeRead.error || nodeRead.status !== 0) {
    const dockerErr = dockerResult.error?.message || dockerResult.stderr || "";
    throw new Error(
      `Failed to read backend logs via docker/node socket: ${
        nodeRead.error?.message || nodeRead.stderr || dockerErr || "unknown error"
      }`,
    );
  }

  return nodeRead.stdout ?? "";
}
