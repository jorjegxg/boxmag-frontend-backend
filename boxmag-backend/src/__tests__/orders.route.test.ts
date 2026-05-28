import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../services/email", () => ({
  isEmailTransportConfigured: vi.fn(() => false),
  sendOrderConfirmationEmailToCustomer: vi.fn(async () => undefined),
  sendNewOrderNotificationEmail: vi.fn(async () => undefined),
}));

import { app } from "../app";

describe("orders routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
  });

  it("returns 400 for invalid status transition payload", async () => {
    const response = await request(app)
      .patch("/api/orders/12/status")
      .send({ status: "unknown-status" });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid order status value");
  });

  it("returns 400 when create order payload is missing required fields", async () => {
    const response = await request(app).post("/api/orders").send({
      boxTypeName: "Standard Box",
      quantity: 100,
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid order payload");
  });
});
