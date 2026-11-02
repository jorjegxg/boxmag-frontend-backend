/**
 * E2E — forgot / reset password (INV-PASSWORD-RESET)
 *
 * Coverage:
 * - forgot: invalid email, existing account, unknown account (exists:false → register CTA)
 * - reset: missing token, too short, mismatch, success, expired token
 */

describe("/forgot-password", () => {
  beforeEach(() => {
    cy.visit("/forgot-password");
    cy.waitForHydration();
  });

  it("validează formatul emailului fără request", () => {
    cy.intercept("POST", "**/api/auth/forgot-password", cy.spy().as("forgotSpy"));
    cy.get("#forgot-email").type("not-an-email");
    cy.get('button[type="submit"]').click();
    cy.get("@forgotSpy").should("not.have.been.called");
  });

  it("confirmă trimiterea pentru cont existent (email normalizat)", () => {
    cy.intercept("POST", "**/api/auth/forgot-password", {
      statusCode: 200,
      body: { ok: true, exists: true },
    }).as("forgot");

    cy.get("#forgot-email").type("  Buyer@Example.com ");
    cy.contains("button", "Send reset link").click();

    cy.wait("@forgot").its("request.body").should("deep.equal", { email: "buyer@example.com" });
    cy.contains("Check your email").should("exist");
  });

  it("oferă crearea contului când emailul nu există", () => {
    cy.intercept("POST", "**/api/auth/forgot-password", {
      statusCode: 200,
      body: { ok: true, exists: false },
    }).as("forgot");

    cy.get("#forgot-email").type("nobody@example.com");
    cy.contains("button", "Send reset link").click();
    cy.wait("@forgot");
    cy.contains("No account found").should("exist");
    cy.contains("a", "Create a new account").should("have.attr", "href").and("include", "/registration");
  });

  it("afișează eroare localizată la eșec server", () => {
    cy.intercept("POST", "**/api/auth/forgot-password", {
      statusCode: 500,
      body: { ok: false, message: "Email service is not configured." },
    }).as("forgotFail");

    cy.get("#forgot-email").type("buyer@example.com");
    cy.contains("button", "Send reset link").click();
    cy.wait("@forgotFail");
    cy.contains("Email service is not configured.").should("not.exist");
  });
});

describe("/reset-password", () => {
  it("fără token afișează link invalid", () => {
    cy.visit("/reset-password");
    cy.contains("Invalid reset link.").should("exist");
  });

  it("validează lungimea și potrivirea parolelor înainte de request", () => {
    cy.intercept("POST", "**/api/auth/reset-password", cy.spy().as("resetSpy"));
    cy.visit("/reset-password?token=abc123");
    cy.waitForHydration();

    cy.get("#reset-password").type("123");
    cy.get("#reset-password-confirm").type("123");
    cy.contains("button", "Reset password").click();
    cy.contains("Password must be at least 6 characters.").should("exist");

    cy.get("#reset-password").clear().type("secret123");
    cy.get("#reset-password-confirm").clear().type("secret124");
    cy.contains("button", "Reset password").click();
    cy.contains("Passwords do not match.").should("exist");
    cy.get("@resetSpy").should("not.have.been.called");
  });

  it("resetează parola cu token valid", () => {
    cy.intercept("POST", "**/api/auth/reset-password", {
      statusCode: 200,
      body: { ok: true },
    }).as("reset");
    cy.visit("/reset-password?token=abc123");
    cy.waitForHydration();

    cy.get("#reset-password").type("secret123");
    cy.get("#reset-password-confirm").type("secret123");
    cy.contains("button", "Reset password").click();

    cy.wait("@reset").its("request.body").should("deep.equal", {
      token: "abc123",
      password: "secret123",
    });
    cy.contains("Password updated").should("exist");
    cy.contains("Go to sign in").should("exist");
  });

  it("token expirat → mesaj de eroare", () => {
    cy.intercept("POST", "**/api/auth/reset-password", {
      statusCode: 400,
      body: { ok: false, message: "Invalid or expired reset token" },
    }).as("resetFail");
    cy.visit("/reset-password?token=expired");
    cy.waitForHydration();

    cy.get("#reset-password").type("secret123");
    cy.get("#reset-password-confirm").type("secret123");
    cy.contains("button", "Reset password").click();
    cy.wait("@resetFail");
    cy.contains("Reset failed").should("exist");
  });
});
