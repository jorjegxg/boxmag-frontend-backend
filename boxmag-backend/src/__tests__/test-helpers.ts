import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "../config/admin-auth";
import {
  USER_COOKIE_NAME,
  createUserSessionToken,
} from "../config/user-auth";

export const TEST_ADMIN_PASSWORD = "test-admin-password";
export const TEST_USER_EMAIL = "customer@example.com";
export const TEST_USER_SESSION_SECRET = "test-user-session-secret";

export function ensureTestAuthEnv(): void {
  process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
  process.env.USER_SESSION_SECRET = TEST_USER_SESSION_SECRET;
}

export function adminCookie(password = TEST_ADMIN_PASSWORD): string {
  return `${ADMIN_COOKIE_NAME}=${createAdminSessionToken(password)}`;
}

export function userCookie(
  userId = 42,
  email = TEST_USER_EMAIL,
): string {
  const token = createUserSessionToken(userId, email);
  if (!token) throw new Error("Failed to create user session token");
  return `${USER_COOKIE_NAME}=${token}`;
}

type FakeConnection = {
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  release: () => void;
  execute: (...args: unknown[]) => Promise<unknown>;
  query: (...args: unknown[]) => Promise<unknown>;
};

export function fakeConnection(
  overrides: Partial<FakeConnection> = {},
): FakeConnection {
  return {
    beginTransaction: overrides.beginTransaction ?? (async () => undefined),
    commit: overrides.commit ?? (async () => undefined),
    rollback: overrides.rollback ?? (async () => undefined),
    release: overrides.release ?? (() => undefined),
    execute: overrides.execute ?? (async () => [[]]),
    query: overrides.query ?? (async () => [[]]),
  };
}
