import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock, queryMock, getConnectionMock, stripeCreateMock } = vi.hoisted(
  () => ({
    executeMock: vi.fn(),
    queryMock: vi.fn(),
    getConnectionMock: vi.fn(),
    stripeCreateMock: vi.fn(),
  }),
);

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    execute: executeMock,
    query: queryMock,
    getConnection: getConnectionMock,
  },
}));

vi.mock("../services/email", () => ({
  isEmailTransportConfigured: vi.fn(() => false),
  sendOrderConfirmationEmailToCustomer: vi.fn(async () => undefined),
  sendNewOrderNotificationEmail: vi.fn(async () => undefined),
}));

vi.mock("../services/stripe", () => ({
  isStripeConfigured: vi.fn(() => true),
  getStripeClient: vi.fn(() => ({
    checkout: {
      sessions: {
        create: stripeCreateMock,
      },
    },
  })),
}));

import { app } from "../app";

describe("payments routes", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("returns 400 when a cart item is below minimum quantity", async () => {
    const response = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({
        email: "buyer@example.com",
        cartItems: [
          {
            itemNo: "STD-001",
            name: "Standard Box",
            unitPrice: 10,
            quantity: 5,
          },
        ],
        shipping: {
          name: "Standard",
          etaText: "3-5 days",
          price: 30,
        },
        vatPercent: 21,
        address: {
          firstName: "Jane",
          lastName: "Doe",
          companyName: "Demo SRL",
          phone: "799000000",
          address: "Str Test 1",
          postcode: "725400",
          city: "Radauti",
          country: "RO",
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Minimum order quantity");
  });

  it("returns 400 when payload misses required checkout fields", async () => {
    const response = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid checkout payload");
  });
});
