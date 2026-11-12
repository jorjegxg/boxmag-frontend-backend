import { vi } from "vitest";

/**
 * Session verification looks up the user's credential stamp in MySQL on every
 * authenticated request. Route tests script `mysqlPool` call-by-call, so the
 * lookup is stubbed globally (empty stamp = what `createUserSessionToken`
 * signs by default). `user-session-invalidation.test.ts` covers the real thing.
 */
vi.mock("../services/user-credential-stamp", () => ({
  getUserCredentialStamp: vi.fn(async () => ""),
}));
