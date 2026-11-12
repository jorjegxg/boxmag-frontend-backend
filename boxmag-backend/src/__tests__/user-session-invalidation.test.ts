import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock("../db/mysql", () => ({
  mysqlPool: { execute: executeMock, query: vi.fn() },
}));
// Use the real credential-stamp lookup (stubbed globally in setup.ts).
vi.unmock("../services/user-credential-stamp");

import cookieParser from "cookie-parser";
import {
  USER_COOKIE_NAME,
  createUserSessionToken,
  credentialStampFromPasswordHash,
  verifyUserSessionToken,
} from "../config/user-auth";
import { requireUser } from "../middleware/require-user";

const OLD_HASH = "scrypt$old-salt$old-hash";
const NEW_HASH = "scrypt$new-salt$new-hash";

const app = express();
app.use(cookieParser());
app.get("/me", requireUser, (req, res) => {
  res.json({ ok: true, session: req.userSession });
});

function cookieFor(passwordHash: string): string {
  const token = createUserSessionToken(
    7,
    "customer@example.com",
    undefined,
    credentialStampFromPasswordHash(passwordHash),
  );
  if (!token) throw new Error("token");
  return `${USER_COOKIE_NAME}=${token}`;
}

describe("user session invalidation on password change (INV-SESSION-RESET)", () => {
  beforeEach(() => {
    executeMock.mockReset();
    process.env.USER_SESSION_SECRET = "test-user-session-secret";
  });

  it("accepts a session issued for the current password", async () => {
    executeMock.mockResolvedValueOnce([[{ password_hash: OLD_HASH }]]);

    const response = await request(app).get("/me").set("Cookie", cookieFor(OLD_HASH));

    expect(response.status).toBe(200);
    expect(response.body.session).toEqual({
      userId: 7,
      email: "customer@example.com",
    });
    expect(executeMock.mock.calls[0]?.[1]).toEqual([7]);
  });

  it("rejects a session issued before the password was reset", async () => {
    executeMock.mockResolvedValueOnce([[{ password_hash: NEW_HASH }]]);

    const response = await request(app).get("/me").set("Cookie", cookieFor(OLD_HASH));

    expect(response.status).toBe(401);
  });

  it("rejects sessions of deleted or deactivated users", async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const response = await request(app).get("/me").set("Cookie", cookieFor(OLD_HASH));

    expect(response.status).toBe(401);
  });

  it("fails closed when the credential lookup errors", async () => {
    executeMock.mockRejectedValueOnce(new Error("db down"));

    const response = await request(app).get("/me").set("Cookie", cookieFor(OLD_HASH));

    expect(response.status).toBe(401);
  });

  it("rejects pre-hardening tokens signed without a credential stamp", () => {
    const legacy = createUserSessionToken(7, "customer@example.com");
    expect(
      verifyUserSessionToken(
        legacy ?? undefined,
        credentialStampFromPasswordHash(OLD_HASH),
      ),
    ).toBeNull();
  });
});
