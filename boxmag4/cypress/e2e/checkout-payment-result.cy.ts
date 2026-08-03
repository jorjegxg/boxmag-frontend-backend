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
 * - /checkout/success guest create-account prompt (like B2B)
 * - /checkout/success logged-in: View my orders, no create-account card
 * - guest checkout (no account) → success → create account on /registration
 * - /checkout/cancel content and links
 *
 * Note: confirmation emails are NOT sent by the frontend. Backend sends them
 * inside markOrderPaidBySession when payment first flips to paid — either via
 * Stripe webhook POST /api/payments/webhook OR via GET /api/payments/sessions/:id
 * when this success page polls. Locally you need `stripe listen --forward-to
 * localhost:3005/api/payments/webhook` OR visit success after pay.
 */

import {
  AUTH_EMAIL_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  CART_STORAGE_KEY,
} from "../support/commands";

const paidSessionBody = {
  ok: true as const,
  data: {
    sessionId: "sess_paid_1",
    paymentStatus: "paid",
    amountTotal: 263375,
    currency: "eur",
    customerEmail: "buyer@example.com",
    contact: {
      firstName: "Jane",
      surname: "Doe",
      companyName: "Demo SRL",
      vatNumber: "RO12345678",
      phone: "799000000",
      email: "buyer@example.com",
    },
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
};

const seedCart = (win: Window) => {
  win.localStorage.setItem("boxmag.language", "en");
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
};

const seedGuest = {
  onBeforeLoad(win: Window) {
    seedCart(win);
    win.localStorage.removeItem(AUTH_STORAGE_KEY);
    win.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
  },
};

const seedLoggedIn = {
  onBeforeLoad(win: Window) {
    seedCart(win);
    win.localStorage.setItem(AUTH_STORAGE_KEY, "true");
    win.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, "buyer@example.com");
  },
};

describe("Checkout success page", () => {
  it("shows paid order details for a successful Stripe session (logged-in)", () => {
    cy.intercept("GET", "**/api/payments/sessions/sess_paid_1", {
      statusCode: 200,
      body: paidSessionBody,
    }).as("getSessionPaid");

    cy.visit("/checkout/success?session_id=sess_paid_1", seedLoggedIn);
    cy.wait("@getSessionPaid");

    cy.contains("Thank you! Payment received.").should("exist");
    cy.contains("ORD-0101").should("exist");
    cy.contains("Standard Delivery").should("exist");
    cy.contains("buyer@example.com").should("exist");
    cy.contains("a", "View my orders")
      .should("have.attr", "href")
      .and("eq", "/account#orders");
    cy.contains("a", "Continue shopping")
      .should("have.attr", "href")
      .and("eq", "/shop");
    cy.contains("Create a free account").should("not.exist");
  });

  it("shows create-account prompt for guest after paid session", () => {
    cy.intercept("GET", "**/api/payments/sessions/sess_paid_guest", {
      statusCode: 200,
      body: {
        ...paidSessionBody,
        data: {
          ...paidSessionBody.data,
          sessionId: "sess_paid_guest",
        },
      },
    }).as("getSessionPaidGuest");

    cy.visit("/checkout/success?session_id=sess_paid_guest", seedGuest);
    cy.wait("@getSessionPaidGuest");

    cy.contains("Thank you! Payment received.").should("exist");
    cy.contains("ORD-0101").should("exist");
    cy.contains("View my orders").should("not.exist");
    cy.contains("Would you like to save this order to an account?").should(
      "exist",
    );
    cy.contains("Create a free account").should("exist");
    cy.contains("No, thanks").should("exist");
    cy.contains("Already have an account?").should("exist");

    cy.contains("a", "Create a free account")
      .should("have.attr", "href")
      .and("include", "/registration?")
      .and("include", "email=buyer%40example.com")
      .and("include", "firstName=Jane")
      .and("include", "from=checkout")
      .and("include", "returnTo=%2Faccount%23orders");
  });

  it("guest skip goes to /shop", () => {
    cy.intercept("GET", "**/api/payments/sessions/sess_paid_skip", {
      statusCode: 200,
      body: {
        ...paidSessionBody,
        data: {
          ...paidSessionBody.data,
          sessionId: "sess_paid_skip",
        },
      },
    }).as("getSessionPaidSkip");

    cy.visit("/checkout/success?session_id=sess_paid_skip", seedGuest);
    cy.wait("@getSessionPaidSkip");

    cy.contains("button", "No, thanks").click();
    cy.location("pathname").should("eq", "/shop");
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
          contact: null,
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

    cy.visit("/checkout/success?session_id=sess_paid_clear", seedGuest);
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
          contact: null,
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

    cy.visit("/checkout/success?session_id=sess_pending_1", seedGuest);
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

    cy.visit("/checkout/success?session_id=sess_fail_1", {
      onBeforeLoad(win) {
        win.localStorage.setItem("boxmag.language", "en");
      },
    });
    cy.wait("@getSessionFail");

    cy.contains("We could not verify your payment").should("exist");
    cy.contains("Stripe error: session not found").should("exist");
    cy.contains("a", "Back to checkout")
      .should("have.attr", "href")
      .and("eq", "/checkout");
  });

  it("shows error when session_id is missing", () => {
    cy.visit("/checkout/success", {
      onBeforeLoad(win) {
        win.localStorage.setItem("boxmag.language", "en");
      },
    });
    cy.contains("We could not verify your payment").should("exist");
    cy.contains("Missing payment session id.").should("exist");
  });
});

describe("Checkout cancel page", () => {
  it("shows cancellation info and navigation actions", () => {
    cy.visit("/checkout/cancel", {
      onBeforeLoad(win) {
        win.localStorage.setItem("boxmag.language", "en");
      },
    });

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

const GUEST_CHECKOUT_EMAIL = "guest.checkout.create@example.com";
const GUEST_CHECKOUT_SESSION = "sess_guest_create_account";
const GUEST_PASSWORD = "TestPass123!";

describe("Guest checkout → create account", () => {
  it("places guest order, then creates account from success page", () => {
    cy.intercept("GET", "**/api/vat-lookup*", {
      statusCode: 200,
      body: {
        ok: true,
        companyName: "Guest Checkout SRL",
        vatNumber: "RO12345678",
      },
    }).as("vatLookupCheckout");

    cy.intercept("POST", "**/api/payments/create-checkout-session", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          url: `/checkout/success?session_id=${GUEST_CHECKOUT_SESSION}`,
          orderId: 501,
          sessionId: GUEST_CHECKOUT_SESSION,
        },
      },
    }).as("createCheckoutGuest");

    cy.intercept(
      "GET",
      `**/api/payments/sessions/${GUEST_CHECKOUT_SESSION}`,
      {
        statusCode: 200,
        body: {
          ok: true,
          data: {
            sessionId: GUEST_CHECKOUT_SESSION,
            paymentStatus: "paid",
            amountTotal: 153750,
            currency: "eur",
            customerEmail: GUEST_CHECKOUT_EMAIL,
            contact: {
              firstName: "Elena",
              surname: "Marin",
              companyName: "Guest Checkout SRL",
              vatNumber: "RO12345678",
              phone: "799888777",
              email: GUEST_CHECKOUT_EMAIL,
            },
            order: {
              id: 501,
              orderNumber: "ORD-0501",
              status: "new",
              paymentStatus: "paid",
              totalAmountCents: 153750,
              currency: "eur",
              quantity: 100,
              transport: "Standard Delivery",
              createdAt: "2026-05-28T10:00:00.000Z",
            },
          },
        },
      },
    ).as("getSessionGuestCreate");

    cy.mockCheckoutApis();
    cy.visit("/checkout", {
      onBeforeLoad(win) {
        win.localStorage.setItem("boxmag.language", "en");
        win.localStorage.removeItem(AUTH_STORAGE_KEY);
        win.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
        win.localStorage.removeItem("boxmag.checkout.shippingMethods.v2");
        win.localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({
            state: {
              items: [
                {
                  itemNo: "BOX-001",
                  name: "Custom Box 300x200",
                  unitPrice: 12.5,
                  quantity: 100,
                  imageUrl: "/b2b/boxes/box.png",
                },
              ],
              newCartItems: 100,
              subtotal: 1250,
              totalItems: 100,
            },
            version: 0,
          }),
        );
      },
    });
    cy.wait("@getShippingMethods");

    cy.get('input[placeholder="Email address"]')
      .clear()
      .type(GUEST_CHECKOUT_EMAIL);
    cy.get('input[placeholder="First name"]').clear().type("Elena");
    cy.get('input[placeholder="Last name"]').clear().type("Marin");
    cy.get('input[placeholder="Address line 1"]').clear().type("Str. Test 7");
    cy.get('input[placeholder="Postcode"]').clear().type("725400");
    cy.get('input[placeholder="City"]').clear().type("Radauti");
    cy.get('input[placeholder="Country"]').clear().type("RO");
    cy.get('input[placeholder="Phone"]').clear().type("799888777");

    cy.get("#checkout-vatNumber").clear().type("RO12345678", { delay: 0 });
    cy.wait("@vatLookupCheckout", { timeout: 15000 });
    cy.get("#checkout-companyName", { timeout: 15000 }).should(
      "have.value",
      "Guest Checkout SRL",
    );

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckoutGuest");

    cy.location("pathname", { timeout: 15000 }).should(
      "eq",
      "/checkout/success",
    );
    cy.location("search").should("include", `session_id=${GUEST_CHECKOUT_SESSION}`);
    cy.wait("@getSessionGuestCreate");

    cy.contains("Thank you! Payment received.").should("exist");
    cy.contains("ORD-0501").should("exist");
    cy.contains("Create a free account").should("exist");
    cy.contains("View my orders").should("not.exist");

    cy.contains("a", "Create a free account").click();
    cy.location("pathname").should("eq", "/registration");
    cy.location("search")
      .should("include", "from=checkout")
      .and("include", `email=${encodeURIComponent(GUEST_CHECKOUT_EMAIL)}`);

    cy.contains(
      "Create an account to save this order and track it from your account.",
    ).should("exist");
    cy.get("#reg-email")
      .should("have.value", GUEST_CHECKOUT_EMAIL)
      .and("have.attr", "readonly");
    cy.get("#reg-firstName").should("have.value", "Elena");
    cy.get("#reg-surname").should("have.value", "Marin");
    cy.get("#reg-vat").should("have.value", "RO12345678");
    cy.get("#reg-phone").should("have.value", "799888777");
    cy.get("#reg-company").should("have.value", "Guest Checkout SRL");

    cy.intercept("POST", "**/api/auth/register", {
      statusCode: 201,
      body: { ok: true, message: "Registration successful" },
    }).as("registerCheckoutGuest");

    cy.get("#reg-password").clear().type(GUEST_PASSWORD);
    cy.get("#reg-confirm").clear().type(GUEST_PASSWORD);
    cy.get("#reg-accept").check({ force: true });
    cy.contains("button", "Register").click();

    cy.wait("@registerCheckoutGuest").its("request.body").should((body) => {
      expect(body.email).to.eq(GUEST_CHECKOUT_EMAIL);
      expect(body.firstName).to.eq("Elena");
      expect(body.surname).to.eq("Marin");
      expect(body.vatNumber).to.eq("RO12345678");
      expect(body.phone).to.eq("799888777");
      expect(body.companyName).to.eq("Guest Checkout SRL");
    });

    cy.contains("Registration Successful").should("exist");
    cy.contains("a", "Back to login")
      .should("have.attr", "href")
      .and("eq", "/account#orders");
  });
});
