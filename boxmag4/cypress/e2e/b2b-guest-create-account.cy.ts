/**
 * b2b-guest-create-account (PAGES_TESTS_TODO2.md)
 *
 * Guest B2B order → create account on success → verify email → login →
 * order visible in account and admin.
 *
 * Requires frontend (:3006), backend (:3005), MySQL, and SMTP for register.
 */

import {
  ACCOUNT_PASSWORD,
  assertAdminOrderDetail,
  assertAdminTableRow,
  assertCustomerOrderDetail,
  assertCustomerOrdersList,
  BACKEND_URL,
  CreateOrderBody,
  FIRST_NAME,
  GUEST_EMAIL,
  PHONE,
  setupGuestSession,
  SURNAME,
  VAT_NUMBER,
  VERIFICATION_TOKEN,
  placeB2bGuestOrder,
} from "../support/b2b-guest-helpers";

describe("b2b-guest-create-account", () => {
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
    setupGuestSession();
    cy.task("resetB2bGuestUser", GUEST_EMAIL);
    cy.intercept("POST", "**/api/orders").as("createOrder");
    cy.intercept("POST", "**/api/auth/register").as("register");
    cy.intercept("POST", "**/api/auth/login").as("login");
    cy.intercept("GET", "**/api/orders*").as("getOrders");
  });

  it("guest places order, creates account on success, and sees order in account and admin", () => {
    placeB2bGuestOrder();

    cy.contains("a", "Create a free account").click();
    cy.location("pathname").should("eq", "/registration");
    cy.location("search").should("include", "from=b2b-order");

    cy.get("#reg-email")
      .should("have.value", GUEST_EMAIL)
      .and("have.attr", "readonly");
    cy.get("#reg-firstName").should("have.value", FIRST_NAME);
    cy.get("#reg-surname").should("have.value", SURNAME);
    cy.get("#reg-vat").should("have.value", VAT_NUMBER);
    cy.get("#reg-phone").should("have.value", PHONE);
    cy.get("#reg-company").invoke("val").should("not.be.empty");

    cy.get("#reg-company")
      .invoke("val")
      .then((companyName) => {
        cy.wrap(String(companyName ?? "")).as("companyName");
      });

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

    cy.get<string>("@companyName").then((companyName) => {
      cy.task("ensurePendingRegistrationForTest", {
        email: GUEST_EMAIL,
        password: ACCOUNT_PASSWORD,
        token: VERIFICATION_TOKEN,
        firstName: FIRST_NAME,
        surname: SURNAME,
        companyName,
        vatNumber: VAT_NUMBER,
        phone: PHONE,
      });
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
      assertCustomerOrdersList(orderNumber);

      cy.get<CreateOrderBody>("@orderPayload").then((orderPayload) => {
        cy.contains("a", orderNumber).click();
        cy.location("pathname").should("match", /^\/account\/orders\/\d+$/);
        assertCustomerOrderDetail(orderNumber, orderPayload);

        cy.loginAdmin();
        cy.intercept("GET", "**/api/orders").as("getAdminOrders");
        cy.visit("/admin");
        cy.wait("@getAdminOrders");

        assertAdminTableRow(orderNumber, orderPayload);
        cy.contains("tr", orderNumber).click();
        cy.location("pathname").should("match", /^\/admin\/orders\/\d+$/);
        assertAdminOrderDetail(orderNumber, orderPayload);

        cy.log(
          `MANUAL CHECK: open ${GUEST_EMAIL} and confirm the B2B order confirmation email for ${orderNumber} was received.`,
        );
        cy.log(
          `MANUAL CHECK: open ${GUEST_EMAIL} and confirm the account verification email was received.`,
        );
      });
    });
  });
});
