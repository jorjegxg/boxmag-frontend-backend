/**
 * E2E tests - checkout payment result pages
 *
 * Docs: cypress/documentation/checkout.md
 *
 * Coverage:
 * - /checkout/success with paid session (server marks paid + sends emails)
 * - /checkout/success clears cart after paid
 * - /checkout/success unpaid/pending (no cart clear — emails not sent yet)
 * - /checkout/success with backend error / missing session_id
 * - /checkout/cancel content and links
 *
 * Note: confirmation emails are NOT sent by the frontend. Backend sends them
 * inside markOrderPaidBySession when payment first flips to paid — either via
 * Stripe webhook POST /api/payments/webhook OR via GET /api/payments/sessions/:id
 * when this success page polls. Locally you need `stripe listen --forward-to
 * localhost:3005/api/payments/webhook` OR visit success after pay.
 */

import { CART_STORAGE_KEY } from "../support/commands";

const seedCartOnVisit = {
  onBeforeLoad(win: Window) {
    win.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          items: [
            {
              itemNo: "STD-001",
              name: "Standard Box",
              unitPrice: 10,
              quantity: 100,
            },
          ],
          newCartItems: 100,
          subtotal: 1000,
          totalItems: 100,
        },
        version: 0,
      }),
    );
  },
};

describe("Checkout success page", () => {
  it("shows paid order details for a successful Stripe session", () => {
    cy.intercept("GET", "**/api/payments/sessions/sess_paid_1", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          sessionId: "sess_paid_1",
          paymentStatus: "paid",
          amountTotal: 263375,
          currency: "eur",
          customerEmail: "buyer@example.com",
          order: {
            id: 101,
            orderNumber: "ORD-0101",
            status: "new",
            paymentStatus: "paid",
            totalAmountCents: 263375,
            currency: "eur",
            quantity: 200,
            transport: "Standard Delivery",
            createdAt: "2026-05-28T10:00:00.000Z",
          },
        },
      },
    }).as("getSessionPaid");

    cy.visit("/checkout/success?session_id=sess_paid_1", seedCartOnVisit);
    cy.wait("@getSessionPaid");

    cy.contains("Thank you! Payment received.").should("exist");
    cy.contains("ORD-0101").should("exist");
    cy.contains("Standard Delivery").should("exist");
    cy.contains("buyer@example.com").should("exist");
    cy.contains("a", "View my orders")
      .should("have.attr", "href")
      .and("eq", "/account");
  });

  it("clears cart from localStorage after paid session", () => {
    cy.intercept("GET", "**/api/payments/sessions/sess_paid_clear", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          sessionId: "sess_paid_clear",
          paymentStatus: "paid",
          amountTotal: 10000,
          currency: "eur",
          customerEmail: "buyer@example.com",
          order: {
            id: 102,
            orderNumber: "ORD-0102",
            status: "new",
            paymentStatus: "paid",
            totalAmountCents: 10000,
            currency: "eur",
            quantity: 100,
            transport: "Standard Delivery",
            createdAt: "2026-05-28T10:00:00.000Z",
          },
        },
      },
    }).as("getSessionPaidClear");

    cy.visit("/checkout/success?session_id=sess_paid_clear", seedCartOnVisit);
    cy.wait("@getSessionPaidClear");
    cy.contains("Thank you! Payment received.").should("exist");

    cy.window().then((win) => {
      const raw = win.localStorage.getItem(CART_STORAGE_KEY);
      expect(raw).to.be.a("string");
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: unknown[]; totalItems?: number };
      };
      expect(parsed.state?.items ?? []).to.have.length(0);
      expect(parsed.state?.totalItems ?? 0).to.eq(0);
    });
  });

  it("keeps cart when payment is still pending (emails not confirmed yet)", () => {
    cy.intercept("GET", "**/api/payments/sessions/sess_pending_1", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          sessionId: "sess_pending_1",
          paymentStatus: "unpaid",
          amountTotal: 10000,
          currency: "eur",
          customerEmail: "buyer@example.com",
          order: {
            id: 103,
            orderNumber: "ORD-0103",
            status: "new",
            paymentStatus: "pending",
            totalAmountCents: 10000,
            currency: "eur",
            quantity: 100,
            transport: "Standard Delivery",
            createdAt: "2026-05-28T10:00:00.000Z",
          },
        },
      },
    }).as("getSessionPending");

    cy.visit("/checkout/success?session_id=sess_pending_1", seedCartOnVisit);
    cy.wait("@getSessionPending");

    cy.contains("Payment is still pending").should("exist");
    cy.contains("unpaid").should("exist");

    cy.window().then((win) => {
      const raw = win.localStorage.getItem(CART_STORAGE_KEY);
      expect(raw).to.be.a("string");
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: unknown[] };
      };
      expect(parsed.state?.items ?? []).to.have.length(1);
    });
  });

  it("shows verify payment error when session endpoint fails", () => {
    cy.intercept("GET", "**/api/payments/sessions/sess_fail_1", {
      statusCode: 502,
      body: {
        ok: false,
        message: "Stripe error: session not found",
      },
    }).as("getSessionFail");

    cy.visit("/checkout/success?session_id=sess_fail_1");
    cy.wait("@getSessionFail");

    cy.contains("We could not verify your payment").should("exist");
    cy.contains("Stripe error: session not found").should("exist");
    cy.contains("a", "Back to checkout")
      .should("have.attr", "href")
      .and("eq", "/checkout");
  });

  it("shows error when session_id is missing", () => {
    cy.visit("/checkout/success");
    cy.contains("We could not verify your payment").should("exist");
    cy.contains("Missing payment session id.").should("exist");
  });
});

describe("Checkout cancel page", () => {
  it("shows cancellation info and navigation actions", () => {
    cy.visit("/checkout/cancel");

    cy.contains("Payment cancelled").should("exist");
    cy.contains("Your cart has not been cleared.").should("exist");
    cy.contains("a", "Back to checkout")
      .should("have.attr", "href")
      .and("eq", "/checkout");
    cy.contains("a", "Continue shopping")
      .should("have.attr", "href")
      .and("eq", "/boxesfetco");
  });
});
