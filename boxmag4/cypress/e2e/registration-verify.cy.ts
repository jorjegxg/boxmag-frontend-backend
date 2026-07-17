/**
 * E2E tests — /registration and /verify-email
 *
 * Coverage:
 * - page load + form fields
 * - registration success + confirmation modal
 * - validation (passwords, terms, duplicate email)
 * - B2B query prefill (?from=b2b-order)
 * - VAT lookup fills company name
 * - verify email success / invalid / missing token
 */

const VAT_CACHE_KEY = "boxmag.vatCompanyCache.v1";

const mockVatLookup = (companyName = "Boxmag Test SRL") => {
  cy.intercept("GET", "**/api/vat-lookup*", {
    statusCode: 200,
    body: { ok: true, companyName },
  }).as("vatLookup");
};

const visitRegistration = (path = "/registration") => {
  mockVatLookup();
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.removeItem(VAT_CACHE_KEY);
    },
  });
};

const fillRegistrationForm = (
  overrides: Partial<{
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    surname: string;
    vatNumber: string;
    phone: string;
    acceptTerms: boolean;
    companyName: string;
  }> = {},
) => {
  const data = {
    email: "new.customer@example.com",
    password: "secret123",
    confirmPassword: "secret123",
    firstName: "Ana",
    surname: "Popescu",
    vatNumber: "RO12345678",
    phone: "+40 700 000 000",
    acceptTerms: true,
    companyName: "Boxmag Test SRL",
    ...overrides,
  };

  mockVatLookup(data.companyName);

  // Invalidate current VAT so the next valid value always triggers lookup
  cy.get("#reg-vat").clear().type("XX");
  cy.get("#reg-company").should("have.value", "");
  cy.get("#reg-vat").clear().type(data.vatNumber);
  cy.wait("@vatLookup");
  cy.get("#reg-company").should("have.value", data.companyName);

  cy.get("#reg-email").clear().type(data.email);
  cy.get("#reg-password").clear().type(data.password);
  cy.get("#reg-confirm").clear().type(data.confirmPassword);
  cy.get("#reg-firstName").clear().type(data.firstName);
  cy.get("#reg-surname").clear().type(data.surname);
  cy.get("#reg-phone").clear().type(data.phone);

  if (data.acceptTerms) {
    cy.get("#reg-accept").check({ force: true });
  } else {
    cy.get("#reg-accept").uncheck({ force: true });
  }
};

describe("Registration page", () => {
  beforeEach(() => {
    visitRegistration();
  });

  it("shows registration form fields", () => {
    cy.contains("h1", "Registration").should("exist");
    cy.get("#reg-vat").should("exist");
    cy.get("#reg-company").should("exist").and("have.attr", "readonly");
    cy.get("#reg-email").should("exist");
    cy.get("#reg-password").should("exist");
    cy.get("#reg-confirm").should("exist");
    cy.get("#reg-firstName").should("exist");
    cy.get("#reg-surname").should("exist");
    cy.get("#reg-phone").should("exist");
    cy.get("#reg-accept").should("exist");
    cy.contains("button", "Register").should("exist");
    cy.contains("a", "Sign in").should("have.attr", "href", "/account");
  });

  it("registers successfully and shows confirmation modal", () => {
    cy.intercept("POST", "**/api/auth/register", {
      statusCode: 201,
      body: { ok: true, message: "Registration successful" },
    }).as("registerSuccess");

    fillRegistrationForm();
    cy.contains("button", "Register").click();

    cy.wait("@registerSuccess").its("request.body").should((body) => {
      expect(body.email).to.eq("new.customer@example.com");
      expect(body.vatNumber).to.eq("RO12345678");
      expect(body.companyName).to.eq("Boxmag Test SRL");
      expect(body.acceptRegulations).to.eq(true);
    });

    cy.contains("Registration Successful").should("exist");
    cy.contains("new.customer@example.com").should("exist");
    cy.contains("a", "Back to login")
      .should("have.attr", "href")
      .and("eq", "/account#orders");
  });

  it("shows validation error when passwords do not match", () => {
    fillRegistrationForm({
      password: "secret123",
      confirmPassword: "different123",
    });
    cy.contains("button", "Register").click();

    cy.contains("Passwords do not match.").should("exist");
  });

  it("requires accepting Regulations and Privacy Policy", () => {
    fillRegistrationForm({ acceptTerms: false });
    cy.contains("button", "Register").click();

    cy.contains(
      "You must accept the Regulations and Privacy Policy.",
    ).should("exist");
  });

  it("shows backend error when register API fails", () => {
    cy.intercept("POST", "**/api/auth/register", {
      statusCode: 409,
      body: {
        ok: false,
        message: "An account with this email already exists",
      },
    }).as("registerFail");

    fillRegistrationForm({ email: "existing@example.com" });
    cy.contains("button", "Register").click();

    cy.wait("@registerFail");
    cy.contains("An account with this email already exists").should("exist");
  });

  it("fills company name from VAT lookup", () => {
    cy.get("#reg-vat").clear().type("XX");
    cy.get("#reg-company").should("have.value", "");
    cy.get("#reg-vat").clear().type("RO2816464");
    cy.wait("@vatLookup");
    cy.get("#reg-company").should("have.value", "Boxmag Test SRL");
  });
});

describe("Registration page — B2B query prefill", () => {
  const b2bQuery =
    "/registration?email=guest%40example.com&firstName=Ion&surname=Popescu&companyName=Guest%20Co&phone=%2B40700000000&vatNumber=RO12345678&from=b2b-order&returnTo=%2Faccount%23orders";

  it("prefills fields from B2B success query and locks email", () => {
    mockVatLookup("Guest Co SRL");
    cy.visit(b2bQuery, {
      onBeforeLoad(win) {
        win.localStorage.removeItem(VAT_CACHE_KEY);
      },
    });

    cy.contains(
      "Create an account to save your B2B quote request and track it from your account.",
    ).should("exist");

    cy.get("#reg-email")
      .should("have.value", "guest@example.com")
      .and("have.attr", "readonly");
    cy.get("#reg-firstName").should("have.value", "Ion");
    cy.get("#reg-surname").should("have.value", "Popescu");
    cy.get("#reg-phone").should("have.value", "+40700000000");
    cy.get("#reg-vat").should("have.value", "RO12345678");
    cy.wait("@vatLookup");
    cy.get("#reg-company").should("have.value", "Guest Co SRL");
  });

  it("uses returnTo from query after successful registration", () => {
    mockVatLookup("Guest Co SRL");
    cy.intercept("POST", "**/api/auth/register", {
      statusCode: 201,
      body: { ok: true, message: "Registration successful" },
    }).as("registerB2b");

    cy.visit(b2bQuery, {
      onBeforeLoad(win) {
        win.localStorage.removeItem(VAT_CACHE_KEY);
      },
    });
    cy.wait("@vatLookup");

    cy.get("#reg-password").clear().type("TestPass123!");
    cy.get("#reg-confirm").clear().type("TestPass123!");
    cy.get("#reg-accept").check({ force: true });
    cy.contains("button", "Register").click();

    cy.wait("@registerB2b");
    cy.contains("Registration Successful").should("exist");
    cy.contains("a", "Back to login")
      .should("have.attr", "href")
      .and("eq", "/account#orders");
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
    cy.contains("Email confirmed successfully. You can now sign in.").should(
      "exist",
    );
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

  it("shows error without API call when token is missing", () => {
    let verifyCalled = false;
    cy.intercept("GET", "**/api/auth/verify-email*", () => {
      verifyCalled = true;
    }).as("verifyMissing");

    cy.visit("/verify-email");

    cy.contains("Verification failed").should("exist");
    cy.contains("Invalid verification link.").should("exist");
    cy.contains("a", "Register Again")
      .should("have.attr", "href")
      .and("eq", "/registration");
    cy.then(() => {
      expect(verifyCalled).to.eq(false);
    });
  });
});
