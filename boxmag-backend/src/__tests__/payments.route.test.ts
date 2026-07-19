import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeMock,
  queryMock,
  getConnectionMock,
  stripeCreateMock,
  stripeRetrieveMock,
  constructEventMock,
  isOrderEmailTransportConfiguredMock,
  sendOrderConfirmationEmailToCustomerMock,
  sendNewOrderNotificationEmailMock,
  isStripeConfiguredMock,
} = vi.hoisted(() => ({
  executeMock: vi.fn(),
  queryMock: vi.fn(),
  getConnectionMock: vi.fn(),
  stripeCreateMock: vi.fn(),
  stripeRetrieveMock: vi.fn(),
  constructEventMock: vi.fn(),
  isOrderEmailTransportConfiguredMock: vi.fn(() => false),
  sendOrderConfirmationEmailToCustomerMock: vi.fn(async (_params: unknown) => undefined),
  sendNewOrderNotificationEmailMock: vi.fn(async () => undefined),
  isStripeConfiguredMock: vi.fn(() => true),
}));

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
  isOrderEmailTransportConfigured: isOrderEmailTransportConfiguredMock,
  sendOrderConfirmationEmailToCustomer: sendOrderConfirmationEmailToCustomerMock,
  sendNewOrderNotificationEmail: sendNewOrderNotificationEmailMock,
}));

vi.mock("../config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/env")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      stripeWebhookSecret: "whsec_test_secret",
    },
  };
});

vi.mock("../services/stripe", () => ({
  isStripeConfigured: isStripeConfiguredMock,
  getStripeClient: vi.fn(() => ({
    checkout: {
      sessions: {
        create: stripeCreateMock,
        retrieve: stripeRetrieveMock,
      },
    },
    webhooks: {
      constructEvent: constructEventMock,
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
    stripeRetrieveMock.mockReset();
    constructEventMock.mockReset();
    isOrderEmailTransportConfiguredMock.mockReset();
    isOrderEmailTransportConfiguredMock.mockReturnValue(false);
    sendOrderConfirmationEmailToCustomerMock.mockReset();
    sendNewOrderNotificationEmailMock.mockReset();
    isStripeConfiguredMock.mockReset();
    isStripeConfiguredMock.mockReturnValue(true);

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

  it("webhook checkout.session.completed marks paid and sends confirmation emails", async () => {
    isOrderEmailTransportConfiguredMock.mockReturnValue(true);
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_paid_1",
          payment_intent: "pi_paid_1",
          amount_total: 12100,
          currency: "eur",
          payment_status: "paid",
        },
      },
    });

    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    queryMock
      .mockResolvedValueOnce([
        [
          {
            id: 55,
            status: "new",
            payment_status: "paid",
            stripe_session_id: "cs_paid_1",
            stripe_payment_intent_id: "pi_paid_1",
            total_amount_cents: 12100,
            subtotal_cents: 10000,
            vat_percent: 21,
            vat_cents: 2100,
            shipping_cents: 0,
            shipping_method: "Standard",
            shipping_eta: "3-5 days",
            currency: "eur",
            box_type_name: "Checkout Cart Order",
            cardboard_type: "N/A",
            cardboard_colour: "N/A",
            box_print: "N/A",
            size_type: "N/A",
            transport: "Standard",
            quantity: 100,
            attachment_name: null,
            attachment_object_name: null,
            attachment_url: null,
            message: "Stripe checkout cart order",
            items_json: JSON.stringify([
              {
                itemNo: "STD-001",
                name: "Standard Box",
                unitPrice: 10,
                quantity: 100,
                lineTotal: 1000,
              },
            ]),
            created_at: new Date("2026-05-28T10:00:00.000Z"),
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            first_name: "Jane",
            surname: "Doe",
            company_name: "Demo SRL",
            vat_number: "RO12345678",
            email: "buyer@example.com",
            phone: "799000000",
            address: "Str Test 1",
            postcode: "725400",
            city: "Radauti",
            country: "RO",
            create_account: 0,
            consent_phone: 1,
            consent_email: 1,
          },
        ],
      ]);

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "t=1,v1=test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_1" })));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(constructEventMock).toHaveBeenCalled();
    expect(sendNewOrderNotificationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmationEmailToCustomerMock).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmationEmailToCustomerMock.mock.calls[0]?.[0]).toMatchObject({
      orderId: 55,
      customerEmail: "buyer@example.com",
      customerName: "Jane Doe",
    });
  });

  it("webhook does not resend emails when order already paid", async () => {
    isOrderEmailTransportConfiguredMock.mockReturnValue(true);
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_paid_dup",
          payment_intent: "pi_paid_dup",
          amount_total: 12100,
          currency: "eur",
          payment_status: "paid",
        },
      },
    });
    executeMock.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "t=1,v1=test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_dup" })));

    expect(response.status).toBe(200);
    expect(sendNewOrderNotificationEmailMock).not.toHaveBeenCalled();
    expect(sendOrderConfirmationEmailToCustomerMock).not.toHaveBeenCalled();
  });

  it("session poll marks paid and sends emails when Stripe reports paid", async () => {
    isOrderEmailTransportConfiguredMock.mockReturnValue(true);
    stripeRetrieveMock.mockResolvedValue({
      id: "cs_poll_1",
      payment_status: "paid",
      payment_intent: "pi_poll_1",
      amount_total: 12100,
      currency: "eur",
      customer_details: { email: "buyer@example.com" },
    });
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
    queryMock
      .mockResolvedValueOnce([
        [
          {
            id: 66,
            status: "new",
            payment_status: "paid",
            stripe_session_id: "cs_poll_1",
            stripe_payment_intent_id: "pi_poll_1",
            total_amount_cents: 12100,
            subtotal_cents: 10000,
            vat_percent: 21,
            vat_cents: 2100,
            shipping_cents: 0,
            shipping_method: "Standard",
            shipping_eta: "3-5 days",
            currency: "eur",
            box_type_name: "Checkout Cart Order",
            cardboard_type: "N/A",
            cardboard_colour: "N/A",
            box_print: "N/A",
            size_type: "N/A",
            transport: "Standard",
            quantity: 100,
            attachment_name: null,
            attachment_object_name: null,
            attachment_url: null,
            message: "Stripe checkout cart order",
            items_json: "[]",
            created_at: new Date("2026-05-28T10:00:00.000Z"),
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            first_name: "Jane",
            surname: "Doe",
            company_name: "Demo SRL",
            vat_number: "RO12345678",
            email: "buyer@example.com",
            phone: "799000000",
            address: "Str Test 1",
            postcode: "725400",
            city: "Radauti",
            country: "RO",
            create_account: 0,
            consent_phone: 1,
            consent_email: 1,
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 66,
            status: "new",
            payment_status: "paid",
            stripe_session_id: "cs_poll_1",
            stripe_payment_intent_id: "pi_poll_1",
            total_amount_cents: 12100,
            currency: "eur",
            box_type_name: "Checkout Cart Order",
            cardboard_type: "N/A",
            cardboard_colour: "N/A",
            box_print: "N/A",
            size_type: "N/A",
            transport: "Standard",
            quantity: 100,
            attachment_name: null,
            attachment_object_name: null,
            attachment_url: null,
            message: null,
            created_at: new Date("2026-05-28T10:00:00.000Z"),
          },
        ],
      ]);

    const response = await request(app).get("/api/payments/sessions/cs_poll_1");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(sendOrderConfirmationEmailToCustomerMock).toHaveBeenCalledTimes(1);
    expect(sendNewOrderNotificationEmailMock).toHaveBeenCalledTimes(1);
  });

  it("returns 503 from create-checkout-session when Stripe is not configured", async () => {
    isStripeConfiguredMock.mockReturnValue(false);

    const response = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({});

    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
    expect(stripeCreateMock).not.toHaveBeenCalled();
  });

  it("returns 503 from session poll when Stripe is not configured", async () => {
    isStripeConfiguredMock.mockReturnValue(false);

    const response = await request(app).get("/api/payments/sessions/cs_any");

    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
    expect(stripeRetrieveMock).not.toHaveBeenCalled();
  });

  it("webhook returns 503 when Stripe is not configured", async () => {
    isStripeConfiguredMock.mockReturnValue(false);

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "t=1,v1=test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_unconfigured" })));

    expect(response.status).toBe(503);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("webhook returns 400 when the stripe-signature header is missing", async () => {
    const response = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_no_sig" })));

    expect(response.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("webhook marks order failed on checkout.session.async_payment_failed", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          id: "cs_failed_1",
        },
      },
    });

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "t=1,v1=test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_failed" })));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("payment_status = 'failed'"),
      ["cs_failed_1"],
    );
    expect(sendNewOrderNotificationEmailMock).not.toHaveBeenCalled();
  });

  it("webhook marks order failed on checkout.session.expired", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_expired_1",
        },
      },
    });

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "t=1,v1=test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_expired" })));

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith(
      expect.stringContaining("payment_status = 'failed'"),
      ["cs_expired_1"],
    );
  });

  it("webhook returns 400 when signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "t=1,v1=bad")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_bad_sig" })));

    expect(response.status).toBe(400);
    expect(response.text).toContain("Webhook signature verification failed");
  });

  it("webhook is a no-op for unhandled event types", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.created",
      data: { object: {} },
    });

    const response = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "t=1,v1=test")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ id: "evt_unhandled" })));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(executeMock).not.toHaveBeenCalled();
  });
});
