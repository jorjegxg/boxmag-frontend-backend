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

vi.mock("../services/exchange-rate.service", () => ({
  getEurRonRate: vi.fn(async () => ({
    rate: 5,
    source: "bnr",
    fetchedAt: "2026-01-01T00:00:00.000Z",
  })),
  convertEurToRon: (amount: number, rate: number) => +(amount * rate).toFixed(2),
  roundMoney: (amount: number) => +amount.toFixed(2),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    execute: executeMock,
    query: queryMock,
    getConnection: getConnectionMock,
  },
}));

vi.mock("../services/email", () => ({
  isOrderEmailTransportConfigured: vi.fn(() => false),
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
    queryMock.mockReset();
    getConnectionMock.mockReset();
    stripeCreateMock.mockReset();

    const connection = {
      beginTransaction: vi.fn(async () => undefined),
      commit: vi.fn(async () => undefined),
      rollback: vi.fn(async () => undefined),
      execute: executeMock,
      release: vi.fn(),
    };
    getConnectionMock.mockResolvedValue(connection);
    executeMock.mockResolvedValue([{ insertId: 99 }]);
    stripeCreateMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });
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
        vatNumber: "RO12345678",
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

  it("returns 400 when VAT number is missing or invalid", async () => {
    const response = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({
        email: "buyer@example.com",
        cartItems: [
          {
            itemNo: "STD-001",
            name: "Standard Box",
            unitPrice: 10,
            quantity: 100,
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
    expect(response.body.message).toContain("VAT number");
  });

  it("returns 400 when payload misses required checkout fields", async () => {
    const response = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid checkout payload");
  });

  it("creates Stripe checkout session in RON when requested", async () => {
    const response = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({
        email: "buyer@example.com",
        currency: "ron",
        cartItems: [
          {
            itemNo: "STD-001",
            name: "Standard Box",
            unitPrice: 10,
            quantity: 100,
          },
        ],
        shipping: {
          name: "Standard",
          etaText: "3-5 days",
          price: 30,
        },
        vatPercent: 21,
        vatNumber: "RO12345678",
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

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(stripeCreateMock).toHaveBeenCalledTimes(1);
    const stripePayload = stripeCreateMock.mock.calls[0]?.[0];
    expect(stripePayload.line_items[0].price_data.currency).toBe("ron");
    expect(stripePayload.line_items[0].price_data.unit_amount).toBe(5000);
    expect(stripePayload.metadata.charge_currency).toBe("ron");
    expect(stripePayload.metadata.eur_ron_rate).toBe("5.0000");
  });

});
