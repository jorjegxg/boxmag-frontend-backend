/**
 * E2E tests - checkout payment result pages
 *
 * Coverage:
 * - /checkout/success with paid session
 * - /checkout/success with backend error
 * - /checkout/cancel content and links
 */

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

    cy.visit("/checkout/success?session_id=sess_paid_1", {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "boxmag.cart",
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
    });
    cy.wait("@getSessionPaid");

    cy.contains("Thank you! Payment received.").should("exist");
    cy.contains("ORD-0101").should("exist");
    cy.contains("Standard Delivery").should("exist");
    cy.contains("buyer@example.com").should("exist");
    cy.contains("a", "View my orders")
      .should("have.attr", "href")
      .and("eq", "/account");
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
