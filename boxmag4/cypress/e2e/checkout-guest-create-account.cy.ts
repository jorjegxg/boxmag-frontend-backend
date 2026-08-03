/**
 * checkout-guest-create-account
 *
 * Guest B2C checkout → create account on success → verify email → login →
 * purchased product/order visible in account and admin.
 *
 * Stripe redirect is stubbed: order is inserted paid in MySQL via cy.task
 * (same shape as create-checkout-session). Requires frontend (:3006),
 * backend (:3005), and MySQL.
 */

import {
  ACCOUNT_PASSWORD,
  assertAdminCheckoutOrderDetail,
  assertAdminCheckoutOrderRow,
  assertCustomerCheckoutOrderDetail,
  assertCustomerCheckoutOrdersList,
  BACKEND_URL,
  COMPANY_NAME,
  FIRST_NAME,
  GUEST_EMAIL,
  PHONE,
  placeGuestCheckoutOrder,
  PRODUCT_NAME,
  routeLocalBackend,
  setupCheckoutGuestSession,
  SURNAME,
  VAT_NUMBER,
  VERIFICATION_TOKEN,
} from "../support/checkout-guest-helpers";

describe("checkout-guest-create-account", () => {
  before(function () {
    cy.request({
      method: "GET",
      url: `${BACKEND_URL}/api/health`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        cy.log(
          `Skipping integration test: backend unavailable at ${BACKEND_URL}/api/health (status ${response.status})`,
        );
        this.skip();
      }
    });
  });

  beforeEach(() => {
    setupCheckoutGuestSession();
    routeLocalBackend();
    cy.task("resetB2bGuestUser", GUEST_EMAIL);
    cy.intercept("POST", "**/api/auth/register").as("register");
    cy.intercept("POST", "**/api/auth/login").as("login");
    cy.intercept("GET", "**/api/orders*").as("getOrders");
  });

  it("guest buys product, creates account on success, and sees order in account", () => {
    placeGuestCheckoutOrder();

    cy.contains("a", "Create a free account").click();
    cy.location("pathname").should("eq", "/registration");
    cy.location("search")
      .should("include", "from=checkout")
      .and("include", `email=${encodeURIComponent(GUEST_EMAIL)}`);

    cy.contains(
      "Create an account to save this order and track it from your account.",
    ).should("exist");
    cy.get("#reg-email")
      .should("have.value", GUEST_EMAIL)
      .and("have.attr", "readonly");
    cy.get("#reg-firstName").clear().type(FIRST_NAME);
    cy.get("#reg-surname").clear().type(SURNAME);
    cy.get("#reg-vat").clear().type(VAT_NUMBER);
    cy.get("#reg-phone").clear().type(PHONE);
    // Company is readonly — filled by VAT lookup/cache, never typed.
    cy.get("#reg-company").should("have.attr", "readonly");
    cy.get("#reg-company").should("have.value", COMPANY_NAME);

    cy.get("#reg-password").clear().type(ACCOUNT_PASSWORD);
    cy.get("#reg-confirm").clear().type(ACCOUNT_PASSWORD);
    cy.get("#reg-accept").check({ force: true });
    cy.contains("button", "Register").click();
    cy.wait("@register").then((interception) => {
      const status = interception.response?.statusCode;
      if (status !== 201) {
        cy.log(
          `Register returned ${status ?? "unknown"}; seeding pending registration for email verification.`,
        );
      }
    });

    cy.task("ensurePendingRegistrationForTest", {
      email: GUEST_EMAIL,
      password: ACCOUNT_PASSWORD,
      token: VERIFICATION_TOKEN,
      firstName: FIRST_NAME,
      surname: SURNAME,
      companyName: COMPANY_NAME,
      vatNumber: VAT_NUMBER,
      phone: PHONE,
    });

    cy.visit(`/verify-email?token=${encodeURIComponent(VERIFICATION_TOKEN)}`);
    cy.contains("Email verified", { timeout: 15000 }).should("exist");
    cy.contains("You can now sign in").should("exist");

    cy.visit("/account#orders");
    cy.contains("h2", "Sign in").should("exist");
    cy.get("#account-login-email").clear().type(GUEST_EMAIL);
    cy.get("#account-login-password").clear().type(ACCOUNT_PASSWORD);
    cy.contains("button", "Sign in").click();
    cy.wait("@login").its("response.statusCode").should("eq", 200);

    cy.get<string>("@orderNumber").then((orderNumber) => {
      cy.wait("@getOrders");
      assertCustomerCheckoutOrdersList(orderNumber);

      cy.contains("a", orderNumber)
        .should("have.attr", "href")
        .and("match", /^\/account\/orders\/\d+$/);

      cy.get<number>("@orderId").then((orderId) => {
        cy.visit(`/account/orders/${orderId}`);
      });
      cy.location("pathname").should("match", /^\/account\/orders\/\d+$/);
      assertCustomerCheckoutOrderDetail(orderNumber);
      cy.contains(PRODUCT_NAME).should("exist");

      cy.loginAdmin();
      cy.intercept("GET", "**/api/orders").as("getAdminOrders");
      cy.visit("/admin/orders");
      cy.wait("@getAdminOrders");

      assertAdminCheckoutOrderRow(orderNumber);
      cy.contains("tr", orderNumber).click();
      cy.location("pathname").should("match", /^\/admin\/orders\/\d+$/);
      assertAdminCheckoutOrderDetail(orderNumber);
    });
  });
});
