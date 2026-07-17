/**
 * E2E tests — LoginRequiredView on /account
 *
 * Coverage:
 * - guest sees Sign in form
 * - empty submit validation
 * - invalid credentials
 * - successful login → localStorage + account tabs
 * - email normalized (trim + lowercase) in POST body
 * - password visibility toggle
 * - Register link
 */

import {
  AUTH_EMAIL_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  TEST_EMAIL,
} from "../support/commands";

const fillLogin = (email: string, password: string) => {
  cy.get("#account-login-email").clear().type(email);
  cy.get("#account-login-password").clear().type(password);
};

describe("LoginRequiredView – /account", () => {
  beforeEach(() => {
    cy.visitAccountLoggedOut();
  });

  it("afișează formularul Sign in pentru vizitator", () => {
    cy.contains("h2", "Sign in").should("exist");
    cy.contains(
      "Sign in to access your account details, addresses, billing and orders.",
    ).should("exist");
    cy.get("#account-login-email").should("exist");
    cy.get("#account-login-password").should("exist");
    cy.contains("button", "Sign in").should("exist");
    cy.contains("button", "MY ACCOUNT").should("not.exist");
  });

  it("afișează linkul Register here către /registration", () => {
    cy.get('a[href="/registration"]')
      .should("exist")
      .and("contain.text", "Register");
  });

  it("afișează eroare la submit fără email și parolă", () => {
    cy.get("#account-login-email").clear();
    cy.get("#account-login-password").clear();
    cy.get("#account-login-email")
      .closest("form")
      .invoke("attr", "novalidate", "true");
    cy.contains("button", "Sign in").click();
    cy.contains("Please enter your email and password.").should("exist");
  });

  it("afișează eroare la credențiale invalide", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 401,
      body: { ok: false, message: "Invalid email or password" },
    }).as("loginFail");

    fillLogin("wrong@example.com", "badpass");
    cy.contains("button", "Sign in").click();

    cy.wait("@loginFail");
    cy.contains("Invalid email or password").should("exist");
    cy.window().then((win) => {
      expect(win.localStorage.getItem(AUTH_STORAGE_KEY)).to.be.null;
      expect(win.localStorage.getItem(AUTH_EMAIL_STORAGE_KEY)).to.be.null;
    });
  });

  it("trimite email normalizat (trim + lowercase) la login", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 200,
      body: { ok: true },
    }).as("loginNormalize");
    cy.mockAccountApis();

    fillLogin("  Test@Example.COM  ", "password123");
    cy.contains("button", "Sign in").click();

    cy.wait("@loginNormalize").its("request.body").should((body) => {
      expect(body.email).to.eq("test@example.com");
      expect(body.password).to.eq("password123");
    });
  });

  it("autentifică utilizatorul, setează localStorage și arată tab-urile", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 200,
      body: { ok: true },
    }).as("loginSuccess");
    cy.mockAccountApis();

    fillLogin(TEST_EMAIL, "password123");
    cy.contains("button", "Sign in").click();

    cy.wait("@loginSuccess");
    cy.wait(["@getProfile", "@getAddresses", "@getOrders"]);

    cy.window().then((win) => {
      expect(win.localStorage.getItem(AUTH_STORAGE_KEY)).to.eq("true");
      expect(win.localStorage.getItem(AUTH_EMAIL_STORAGE_KEY)).to.eq(TEST_EMAIL);
    });

    cy.contains("h2", "Sign in").should("not.exist");
    cy.contains("button", "MY ACCOUNT").should("exist");
    cy.contains("button", "ADDRESS").should("exist");
    cy.contains("button", "ORDERS").should("exist");
    cy.get("#acc-first").should("have.value", "John");
  });

  it("comută vizibilitatea parolei", () => {
    cy.get("#account-login-password").should("have.attr", "type", "password");
    cy.get('button[aria-label="Show password"]').click();
    cy.get("#account-login-password").should("have.attr", "type", "text");
    cy.get('button[aria-label="Hide password"]').click();
    cy.get("#account-login-password").should("have.attr", "type", "password");
  });

  it("sesiunea din localStorage supraviețuiește reload-ului", () => {
    cy.intercept("POST", "**/api/auth/login", {
      statusCode: 200,
      body: { ok: true },
    }).as("loginSuccess");
    cy.mockAccountApis();

    fillLogin(TEST_EMAIL, "password123");
    cy.contains("button", "Sign in").click();
    cy.wait("@loginSuccess");
    cy.wait(["@getProfile", "@getAddresses", "@getOrders"]);
    cy.contains("button", "MY ACCOUNT").should("exist");

    cy.reload();
    cy.wait(["@getProfile", "@getAddresses", "@getOrders"]);

    cy.contains("h2", "Sign in").should("not.exist");
    cy.contains("button", "MY ACCOUNT").should("exist");
    cy.get("#acc-first").should("have.value", "John");
  });
});
