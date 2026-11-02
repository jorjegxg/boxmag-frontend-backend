import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminCookie, ensureTestAuthEnv, userCookie } from "./test-helpers";

const { queryMock, executeMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  executeMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
  },
}));

import { app } from "../app";

/** Public limiters guard credential guessing and form spam — not admin/session reads. */
describe("rate limiters", () => {
  beforeEach(() => {
    ensureTestAuthEnv();
    queryMock.mockReset();
    queryMock.mockResolvedValue([[]]);
    executeMock.mockReset();
    executeMock.mockResolvedValue([[]]);
  });

  it("never throttles the admin contact inbox", async () => {
    const cookie = adminCookie();
    for (let i = 0; i < 35; i += 1) {
      const response = await request(app).get("/api/contact").set("Cookie", cookie);
      expect(response.status).toBe(200);
    }
  });

  it("exempts admin-authenticated contact submissions (Next server-to-server)", async () => {
    executeMock.mockResolvedValue([{ insertId: 1 }]);
    const cookie = adminCookie();
    const body = { firstName: "A", surname: "B", email: "a@example.com", message: "Hi" };
    for (let i = 0; i < 35; i += 1) {
      const response = await request(app)
        .post("/api/contact")
        .set("Cookie", cookie)
        .send(body);
      expect(response.status).toBe(201);
    }
  });

  it("does not count profile reads against the auth limiter", async () => {
    const cookie = userCookie();
    for (let i = 0; i < 45; i += 1) {
      const response = await request(app).get("/api/auth/profile").set("Cookie", cookie);
      expect(response.status).not.toBe(429);
    }
  });

  it("still throttles anonymous login attempts", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 41; i += 1) {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ email: "x@example.com", password: "wrong-password" });
      statuses.push(response.status);
    }
    expect(statuses.at(-1)).toBe(429);
  });
});
