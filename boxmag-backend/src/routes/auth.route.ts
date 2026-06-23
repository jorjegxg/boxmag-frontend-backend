import crypto from "crypto";
import { Router } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { env } from "../config/env";
import { mysqlPool } from "../db/mysql";
import {
  isEmailTransportConfigured,
  sendVerificationEmail,
} from "../services/email";

type RegisterPayload = {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  surname?: unknown;
  companyName?: unknown;
  vatNumber?: unknown;
  phone?: unknown;
  acceptRegulations?: unknown;
};

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

type UpdateProfilePayload = {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
};

type ExistingUserRow = RowDataPacket & {
  id: number;
};

type LoginUserRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: number;
  email_verified_at: Date | string | null;
};

type UserProfileRow = RowDataPacket & {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  vat_number: string | null;
};

type PendingRegistrationRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  vat_number: string | null;
  phone: string | null;
  verification_expires_at: Date | string | null;
};

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedPasswordHash: string): boolean {
  const [salt, expectedHash] = storedPasswordHash.split(":");
  if (!salt || !expectedHash) return false;
  const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");
  const actualHashBuffer = Buffer.from(actualHash, "hex");
  const expectedHashBuffer = Buffer.from(expectedHash, "hex");
  if (actualHashBuffer.length !== expectedHashBuffer.length) return false;
  return crypto.timingSafeEqual(actualHashBuffer, expectedHashBuffer);
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const payload = (req.body ?? {}) as LoginPayload;
  const emailRaw = toOptionalString(payload.email);
  const passwordRaw = toOptionalString(payload.password);

  if (!emailRaw || !passwordRaw) {
    res.status(400).json({
      ok: false,
      message: "Email and password are required",
    });
    return;
  }

  const normalizedEmail = emailRaw.toLowerCase();

  try {
    const [rows] = await mysqlPool.execute<LoginUserRow[]>(
      `SELECT id, email, password_hash, first_name, last_name, phone, is_active, email_verified_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      res.status(401).json({
        ok: false,
        message: "Invalid email or password",
      });
      return;
    }

    const user = rows[0]!;
    if (!verifyPassword(passwordRaw, user.password_hash)) {
      res.status(401).json({
        ok: false,
        message: "Invalid email or password",
      });
      return;
    }

    if (!user.email_verified_at) {
      res.status(403).json({
        ok: false,
        message: "Please verify your email before signing in",
      });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({
        ok: false,
        message: "Your account is inactive",
      });
      return;
    }

    await mysqlPool.execute(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [user.id]
    );

    res.status(200).json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name ?? "",
        lastName: user.last_name ?? "",
        phone: user.phone ?? "",
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Failed to login user", error);
    res.status(500).json({
      ok: false,
      message: "Failed to login user",
    });
  }
});

authRouter.get("/profile", async (req, res) => {
  const emailRaw =
    typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!emailRaw) {
    res.status(400).json({
      ok: false,
      message: "Email query param is required",
    });
    return;
  }

  try {
    const [rows] = await mysqlPool.execute<UserProfileRow[]>(
      `SELECT email, first_name, last_name, phone, vat_number
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [emailRaw]
    );

    if (rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "User not found",
      });
      return;
    }

    const user = rows[0]!;
    res.status(200).json({
      ok: true,
      data: {
        email: user.email,
        firstName: user.first_name ?? "",
        lastName: user.last_name ?? "",
        phone: user.phone ?? "",
        vatNumber: user.vat_number ?? "",
      },
    });
  } catch (error) {
    console.error("Failed to load user profile", error);
    res.status(500).json({
      ok: false,
      message: "Failed to load user profile",
    });
  }
});

authRouter.put("/profile", async (req, res) => {
  const payload = (req.body ?? {}) as UpdateProfilePayload;
  const emailRaw = toOptionalString(payload.email);
  if (!emailRaw) {
    res.status(400).json({
      ok: false,
      message: "Email is required",
    });
    return;
  }

  const normalizedEmail = emailRaw.toLowerCase();
  const firstName = toOptionalString(payload.firstName);
  const lastName = toOptionalString(payload.lastName);
  const phone = toOptionalString(payload.phone);

  try {
    const [rows] = await mysqlPool.execute<ExistingUserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: "User not found",
      });
      return;
    }

    const userId = rows[0]!.id;
    await mysqlPool.execute(
      `UPDATE users
       SET first_name = ?, last_name = ?, phone = ?
       WHERE id = ?`,
      [firstName, lastName, phone, userId]
    );

    res.status(200).json({
      ok: true,
      data: {
        email: normalizedEmail,
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        phone: phone ?? "",
      },
      message: "Profile updated",
    });
  } catch (error) {
    console.error("Failed to update user profile", error);
    res.status(500).json({
      ok: false,
      message: "Failed to update user profile",
    });
  }
});

authRouter.post("/register", async (req, res) => {
  const payload = (req.body ?? {}) as RegisterPayload;

  const emailRaw = toOptionalString(payload.email);
  const passwordRaw = toOptionalString(payload.password);
  const firstName = toOptionalString(payload.firstName);
  const surname = toOptionalString(payload.surname);
  const companyName = toOptionalString(payload.companyName);
  const vatNumber = toOptionalString(payload.vatNumber);
  const phone = toOptionalString(payload.phone);
  const acceptedTerms = payload.acceptRegulations === true;

  if (
    !emailRaw ||
    !passwordRaw ||
    passwordRaw.length < 6 ||
    !firstName ||
    !surname ||
    !acceptedTerms
  ) {
    res.status(400).json({
      ok: false,
      message: "Invalid registration payload",
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

  if (!isEmailTransportConfigured()) {
    res.status(500).json({
      ok: false,
      message:
        "Email service is not configured. Set SMTP_USER, SMTP_PASS and EMAIL_FROM.",
    });
    return;
  }

  try {
    const [existingRows] = await mysqlPool.execute<ExistingUserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (existingRows.length > 0) {
      res.status(409).json({
        ok: false,
        message: "An account with this email already exists",
      });
      return;
    }

    const passwordHash = hashPassword(passwordRaw);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = sha256Hex(verificationToken);
    const expiresMinutes = env.verificationExpiresMinutes;
    const verificationExpiresAt = new Date(
      Date.now() + expiresMinutes * 60 * 1000
    );

    await mysqlPool.execute<ResultSetHeader>(
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
        firstName,
        surname,
        companyName,
        vatNumber,
        phone,
        verificationTokenHash,
        verificationExpiresAt,
      ]
    );

    const verifyUrl =
      `${env.frontendBaseUrl.replace(/\/$/, "")}/verify-email` +
      `?token=${encodeURIComponent(verificationToken)}`;

    await sendVerificationEmail({
      to: normalizedEmail,
      verifyUrl,
      expiresMinutes,
    });

    res.status(201).json({
      ok: true,
      data: {
        email: normalizedEmail,
        requiresEmailVerification: true,
      },
      message: "Registration successful. Check your email for the verification link.",
    });
  } catch (error) {
    console.error("Failed to register user", error);
    res.status(500).json({
      ok: false,
      message: "Failed to register user",
    });
  }
});

authRouter.get("/verify-email", async (req, res) => {
  const token =
    typeof req.query.token === "string" ? req.query.token.trim() : "";

  if (!token) {
    res.status(400).send("<h1>Invalid verification link.</h1>");
    return;
  }

  const tokenHash = sha256Hex(token);
  try {
    const [rows] = await mysqlPool.execute<PendingRegistrationRow[]>(
      `SELECT id, email, password_hash, first_name, last_name, company_name, vat_number, phone, verification_expires_at
       FROM pending_user_registrations
       WHERE verification_token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      res.status(400).send("<h1>Verification link is invalid or already used.</h1>");
      return;
    }

    const user = rows[0]!;
    const expiresAtRaw = user.verification_expires_at;
    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      res.status(400).send(
        "<h1>Verification link expired.</h1><p>Please register again and use the newest link.</p>"
      );
      return;
    }

    const [existingRows] = await mysqlPool.execute<ExistingUserRow[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [user.email]
    );
    if (existingRows.length === 0) {
      await mysqlPool.execute(
        `INSERT INTO users
          (email, password_hash, first_name, last_name, company_name, vat_number, phone,
           email_verification_token_hash, email_verification_expires_at, email_verified_at, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, CURRENT_TIMESTAMP, 'customer', 1)`,
        [
          user.email,
          user.password_hash,
          user.first_name,
          user.last_name,
          user.company_name,
          user.vat_number,
          user.phone,
        ]
      );
    }

    await mysqlPool.execute(
      `DELETE FROM pending_user_registrations WHERE id = ?`,
      [user.id]
    );

    const accountUrl = `${env.frontendBaseUrl.replace(/\/$/, "")}/account`;
    res
      .status(200)
      .send(
        `<h1>Email confirmed successfully.</h1><p>You can now sign in.</p><p><a href="${escapeHtml(accountUrl)}">Go to account</a></p>`
      );
  } catch (error) {
    console.error("Failed to verify email", error);
    res.status(500).send("<h1>Failed to verify email.</h1>");
  }
});
