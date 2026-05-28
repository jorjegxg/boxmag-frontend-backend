/**
 * E2E tests - /registration and /verify-email
 *
 * Coverage:
 * - registration success
 * - registration validation errors
 * - verify email success
 * - verify email invalid token
 */

describe("Registration page", () => {
  beforeEach(() => {
    cy.visit("/registration");
  });

  it("registers successfully and shows confirmation modal", () => {
    cy.intercept("POST", "**/api/auth/register", {
      statusCode: 201,
      body: {
        ok: true,
        message: "Registration successful",
      },
    }).as("registerSuccess");

    cy.get("#reg-email").clear().type("new.customer@example.com");
    cy.get("#reg-password").clear().type("secret123");
    cy.get("#reg-confirm").clear().type("secret123");
    cy.get("#reg-firstName").clear().type("Ana");
    cy.get("#reg-surname").clear().type("Popescu");
    cy.get("#reg-accept").check({ force: true });
    cy.contains("button", "Register").click();

    cy.wait("@registerSuccess").its("request.body").should((body) => {
      expect(body.email).to.eq("new.customer@example.com");
      expect(body.acceptRegulations).to.eq(true);
    });
    cy.contains("Registration Successful").should("exist");
    cy.contains("new.customer@example.com").should("exist");
    cy.contains("a", "Back to login")
      .should("have.attr", "href")
      .and("eq", "/account");
  });

  it("shows validation error when passwords do not match", () => {
    cy.get("#reg-email").clear().type("user@example.com");
    cy.get("#reg-password").clear().type("secret123");
    cy.get("#reg-confirm").clear().type("different123");
    cy.get("#reg-accept").check({ force: true });
    cy.contains("button", "Register").click();

    cy.contains("Passwords do not match.").should("exist");
  });

  it("shows backend error when register API fails", () => {
    cy.intercept("POST", "**/api/auth/register", {
      statusCode: 409,
      body: {
        ok: false,
        message: "An account with this email already exists",
      },
    }).as("registerFail");

    cy.get("#reg-email").clear().type("existing@example.com");
    cy.get("#reg-password").clear().type("secret123");
    cy.get("#reg-confirm").clear().type("secret123");
    cy.get("#reg-firstName").clear().type("Ana");
    cy.get("#reg-surname").clear().type("Popescu");
    cy.get("#reg-accept").check({ force: true });
    cy.contains("button", "Register").click();

    cy.wait("@registerFail");
    cy.contains("An account with this email already exists").should("exist");
  });
});

describe("Verify email page", () => {
  it("shows success state when token is valid", () => {
    cy.intercept("GET", "**/api/auth/verify-email?token=valid-token", {
      statusCode: 200,
      body: "<h1>Email confirmed successfully.</h1>",
      headers: { "content-type": "text/html" },
    }).as("verifySuccess");

    cy.visit("/verify-email?token=valid-token");
    cy.wait("@verifySuccess");

    cy.contains("Email verified").should("exist");
    cy.contains("Email confirmed successfully. You can now sign in.").should("exist");
    cy.contains("a", "Go to Sign In")
      .should("have.attr", "href")
      .and("eq", "/account");
  });

  it("shows error state when token is invalid", () => {
    cy.intercept("GET", "**/api/auth/verify-email?token=expired-token", {
      statusCode: 400,
      body: "<h1>Verification link expired.</h1>",
      headers: { "content-type": "text/html" },
    }).as("verifyFail");

    cy.visit("/verify-email?token=expired-token");
    cy.wait("@verifyFail");

    cy.contains("Verification failed").should("exist");
    cy.contains("Verification link is invalid or expired.").should("exist");
    cy.contains("a", "Register Again")
      .should("have.attr", "href")
      .and("eq", "/registration");
  });
});
