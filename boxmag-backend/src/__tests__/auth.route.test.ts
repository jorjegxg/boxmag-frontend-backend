import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    execute: executeMock,
  },
}));

vi.mock("../services/email", () => ({
  isEmailTransportConfigured: vi.fn(() => true),
  sendVerificationEmail: vi.fn(async () => undefined),
}));

import { app } from "../app";

describe("auth routes", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("returns 400 when login payload is missing", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("required");
  });

  it("returns 400 when verify-email token is missing", async () => {
    const response = await request(app).get("/api/auth/verify-email");

    expect(response.status).toBe(400);
    expect(response.text).toContain("Invalid verification link");
  });

  it("returns 400 when register payload is invalid", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "customer@example.com",
      password: "123",
      firstName: "Jane",
      surname: "Doe",
      acceptRegulations: false,
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid registration payload");
  });
});
