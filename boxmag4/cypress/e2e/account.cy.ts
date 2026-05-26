/**
 * E2E tests – pagina /account
 *
 * Scenarii:
 *  - Vizitator neautentificat: formular login, link înregistrare
 *  - Login: validare, credențiale greșite, succes
 *  - Utilizator autentificat: tab-uri, profil, adrese, comenzi, logout
 */

import { TEST_EMAIL } from "../support/commands";

const fillLogin = (email: string, password: string) => {
  cy.get("#account-login-email").clear().type(email);
  cy.get("#account-login-password").clear().type(password);
};

const fillAddressForm = (overrides: Partial<{
  firstName: string;
  lastName: string;
  addressLine1: string;
  postcode: string;
  city: string;
  country: string;
}> = {}) => {
  const data = {
    firstName: "Ana",
    lastName: "Popescu",
    addressLine1: "Str. Test 10",
    postcode: "725400",
    city: "Radauti",
    country: "RO",
    ...overrides,
  };

  cy.get('input[placeholder="First Name *"]').clear().type(data.firstName);
  cy.get('input[placeholder="Last Name *"]').clear().type(data.lastName);
  cy.get('input[placeholder="Address line 1 *"]').clear().type(data.addressLine1);
  cy.get('input[placeholder="Postcode *"]').clear().type(data.postcode);
  cy.get('input[placeholder="City *"]').clear().type(data.city);
  cy.get('input[placeholder="Country *"]').clear().type(data.country);
};

// ---------------------------------------------------------------------------

describe("Account page – vizitator neautentificat", () => {
  beforeEach(() => {
    cy.visitAccountLoggedOut();
  });

  it("afișează formularul de sign in", () => {
    cy.contains("h2", "Sign in").should("exist");
    cy.get("#account-login-email").should("exist");
    cy.get("#account-login-password").should("exist");
    cy.contains("button", "Sign in").should("exist");
  });

  it("afișează linkul către înregistrare", () => {
    cy.get('a[href="/registration"]').should("have.length.at.least", 1);
  });

  it("breadcrumb-ul conține linkul Home", () => {
    cy.get('a[href="/"]').first().should("exist");
  });

  it("nu afișează sidebar-ul de tab-uri când nu ești logat", () => {
    cy.contains("button", "SIGN OUT").should("not.exist");
    cy.contains("button", "MY ACCOUNT").should("not.exist");
  });
});

// ---------------------------------------------------------------------------

describe("Account page – login", () => {
  beforeEach(() => {
    cy.visitAccountLoggedOut();
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
  });

  it("autentifică utilizatorul și afișează tab-urile contului", () => {
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
});

// ---------------------------------------------------------------------------

describe("Account page – tab My Account", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn();
  });

  it("afișează câmpurile de profil populate din API", () => {
    cy.get("#acc-first").should("have.value", "John");
    cy.get("#acc-last").should("have.value", "Doe");
    cy.get("#acc-phone").should("have.value", "799111222");
    cy.get("#acc-email").should("have.value", TEST_EMAIL);
  });

  it("permite editarea câmpurilor de profil", () => {
    cy.get("#acc-first").clear().type("Maria");
    cy.get("#acc-first").should("have.value", "Maria");
  });
});

// ---------------------------------------------------------------------------

describe("Account page – tab Address", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn();
    cy.contains("button", "ADDRESS").click();
  });

  it("afișează mesajul când nu există adrese salvate", () => {
    cy.contains("No saved addresses yet.").should("exist");
    cy.contains("h3", "Add new address").should("exist");
  });

  it("afișează adresele salvate din API", () => {
    cy.visitAccountLoggedIn({
      addresses: [
        {
          id: 1,
          label: "Home",
          companyName: "Boxmag SRL",
          firstName: "Ana",
          lastName: "Popescu",
          phone: "799111222",
          addressLine1: "Str. Test 10",
          addressLine2: "",
          postcode: "725400",
          city: "Radauti",
          country: "RO",
          isDefaultBilling: true,
          isDefaultShipping: true,
        },
      ],
    });
    cy.contains("button", "ADDRESS").click();
    cy.contains("Ana Popescu").should("exist");
    cy.contains("Str. Test 10").should("exist");
    cy.contains("Default shipping").should("exist");
  });

  it("trimite POST la salvarea unei adrese noi", () => {
    cy.intercept("POST", "**/api/addresses", {
      statusCode: 200,
      body: { ok: true },
    }).as("createAddress");

    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: {
        ok: true,
        data: [
          {
            id: 2,
            label: "Office",
            companyName: "",
            firstName: "Ana",
            lastName: "Popescu",
            phone: "",
            addressLine1: "Str. Test 10",
            addressLine2: "",
            postcode: "725400",
            city: "Radauti",
            country: "RO",
            isDefaultBilling: true,
            isDefaultShipping: true,
          },
        ],
      },
    }).as("reloadAddresses");

    fillAddressForm();
    cy.contains("button", "Save address").click();

    cy.wait("@createAddress").its("request.body").should((body) => {
      expect(body.firstName).to.eq("Ana");
      expect(body.email).to.eq(TEST_EMAIL);
    });
    cy.wait("@reloadAddresses");
    cy.contains("Ana Popescu").should("exist");
  });

  it("intră în modul edit la click pe Edit", () => {
    cy.visitAccountLoggedIn({
      addresses: [
        {
          id: 5,
          label: "Home",
          companyName: "",
          firstName: "Ana",
          lastName: "Popescu",
          phone: "",
          addressLine1: "Str. Veche 1",
          addressLine2: "",
          postcode: "111111",
          city: "Bucuresti",
          country: "RO",
          isDefaultBilling: false,
          isDefaultShipping: true,
        },
      ],
    });
    cy.contains("button", "ADDRESS").click();
    cy.contains("button", "Edit").click();

    cy.contains("h3", "Edit address").should("exist");
    cy.get('input[placeholder="Address line 1 *"]').should("have.value", "Str. Veche 1");
    cy.contains("button", "Update address").should("exist");
    cy.contains("button", "Cancel").should("exist");
  });

  it("anulează editarea adresei", () => {
    cy.visitAccountLoggedIn({
      addresses: [
        {
          id: 5,
          label: "Home",
          companyName: "",
          firstName: "Ana",
          lastName: "Popescu",
          phone: "",
          addressLine1: "Str. Veche 1",
          addressLine2: "",
          postcode: "111111",
          city: "Bucuresti",
          country: "RO",
          isDefaultBilling: false,
          isDefaultShipping: true,
        },
      ],
    });
    cy.contains("button", "ADDRESS").click();
    cy.contains("button", "Edit").click();
    cy.contains("button", "Cancel").click();
    cy.contains("h3", "Add new address").should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Account page – tab Orders", () => {
  it("afișează mesajul când nu există comenzi", () => {
    cy.visitAccountLoggedIn({ orders: [] });
    cy.contains("button", "ORDERS").click();
    cy.contains("No orders found.").should("exist");
  });

  it("afișează lista de comenzi cu link către detalii", () => {
    cy.visitAccountLoggedIn({
      orders: [
        {
          id: 42,
          orderNumber: "ORD-2026-001",
          status: "processing",
          createdAt: "2026-05-20T10:00:00.000Z",
        },
      ],
    });
    cy.contains("button", "ORDERS").click();

    cy.contains("ORD-2026-001").should("exist");
    cy.get('a[href="/account/orders/42"]').should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Account page – navigare tab-uri și logout", () => {
  beforeEach(() => {
    cy.visitAccountLoggedIn();
  });

  it("schimbă tab-ul activ la click pe ADDRESS și ORDERS", () => {
    cy.contains("button", "ADDRESS").click();
    cy.contains("h2", "ADDRESS").should("exist");
    cy.contains("Saved addresses").should("exist");

    cy.contains("button", "ORDERS").click();
    cy.contains("h2", "ORDERS").should("exist");
    cy.contains("No orders found.").should("exist");

    cy.contains("button", "MY ACCOUNT").click();
    cy.get("#acc-first").should("exist");
  });

  it("deconectează utilizatorul și revine la formularul de login", () => {
    cy.contains("button", "SIGN OUT").click();

    cy.contains("h2", "Sign in").should("exist");
    cy.contains("button", "MY ACCOUNT").should("not.exist");

    cy.window().then((win) => {
      expect(win.localStorage.getItem("boxmag.auth.loggedIn")).to.be.null;
      expect(win.localStorage.getItem("boxmag.auth.email")).to.be.null;
    });
  });
});
