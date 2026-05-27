/**
 * E2E tests – /checkout
 *
 * Focus: coș gol, login required, adresă incompletă, adresă manuală, erori API.
 */

import { TEST_EMAIL, sampleWarehouseAddress } from "../support/commands";

const fillManualAddress = (overrides: Partial<Record<string, string>> = {}) => {
  const data = {
    firstName: "Elena",
    lastName: "Marin",
    companyName: "Test SRL",
    addressLine1: "Str. Test 7",
    addressLine2: "",
    postcode: "725400",
    city: "Radauti",
    country: "RO",
    phone: "799888777",
    ...overrides,
  };

  cy.get('input[placeholder="First name"]').clear().type(data.firstName);
  cy.get('input[placeholder="Last name"]').clear().type(data.lastName);
  cy.get('input[placeholder="Company name (optional)"]').clear().type(data.companyName);
  cy.get('input[placeholder="Address line 1"]').clear().type(data.addressLine1);
  if (data.addressLine2) {
    cy.get('input[placeholder="Address line 2 (optional)"]').clear().type(data.addressLine2);
  }
  cy.get('input[placeholder="Postcode"]').clear().type(data.postcode);
  cy.get('input[placeholder="City"]').clear().type(data.city);
  cy.get('input[placeholder="Country"]').clear().type(data.country);
  cy.get('input[placeholder="Phone"]').clear().type(data.phone);
};

describe("/checkout", () => {
  it("afișează mesajul de coș gol când nu există produse", () => {
    cy.visitCheckoutLoggedOut({ cartItems: [] });
    cy.contains("Cart is empty.").should("exist");
  });

  it("nu permite Place order când nu ești logat (login required)", () => {
    cy.visitCheckoutLoggedOut();
    cy.contains("button", "Place order").click();
    cy.contains("Please log in before placing an order.").should("exist");
  });

  it("când ești logat dar fără adrese, cere adresă manuală și validează incomplete address", () => {
    cy.visitCheckoutLoggedIn({ addresses: [] });

    cy.contains("Fill the form below with a new shipping address.").should("exist");
    cy.contains("button", "Place order").click();
    cy.contains("Please complete shipping address details.").should("exist");
  });

  it("trimite create-checkout-session cu adresă manuală când nu ai adrese salvate", () => {
    cy.visitCheckoutLoggedIn({ addresses: [] });

    fillManualAddress();

    cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
      expect(req.body.email).to.eq(TEST_EMAIL);
      expect(req.body.address.firstName).to.eq("Elena");
      expect(req.body.address.lastName).to.eq("Marin");
      expect(req.body.address.address).to.eq("Str. Test 7");
      expect(req.body.address.postcode).to.eq("725400");
      expect(req.body.address.city).to.eq("Radauti");
      expect(req.body.address.country).to.eq("RO");
      req.reply({
        statusCode: 200,
        body: { ok: true, data: { url: "/checkout#payment-redirect", orderId: 7 } },
      });
    }).as("createCheckout");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckout");
    cy.location("hash").should("eq", "#payment-redirect");
  });

  it("trimite create-checkout-session cu adresa salvată când există addresses", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });

    cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
      expect(req.body.email).to.eq(TEST_EMAIL);
      expect(req.body.address.firstName).to.eq("Ana");
      expect(req.body.address.lastName).to.eq("Popescu");
      expect(req.body.address.address).to.eq("Str. Depozit 15");
      expect(req.body.address.city).to.eq("Radauti");
      expect(req.body.address.country).to.eq("RO");
      req.reply({
        statusCode: 200,
        body: { ok: true, data: { url: "/checkout#payment-redirect", orderId: 8 } },
      });
    }).as("createCheckout");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckout");
    cy.location("hash").should("eq", "#payment-redirect");
  });

  it("afișează eroare când create-checkout-session eșuează", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });

    cy.intercept("POST", "**/api/payments/create-checkout-session", {
      statusCode: 500,
      body: { ok: false, message: "Server error" },
    }).as("createCheckoutFail");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckoutFail");
    cy.contains("Server error").should("exist");
  });

  it("butonul Place order devine disabled în timpul submit-ului", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });

    cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
      req.reply((res) => {
        res.setDelay(1200);
        res.send({
          statusCode: 200,
          body: { ok: true, data: { url: "/checkout#payment-redirect", orderId: 9 } },
        });
      });
    }).as("slowCheckout");

    cy.contains("button", "Place order").click();
    // Textul se schimbă în "Placing order..." cât timp e submitting
    cy.contains("button", /Place order|Placing order\.\.\./).should("be.disabled");
    cy.wait("@slowCheckout");
    // Pe succes pagina începe redirect-ul, deci butonul poate rămâne disabled (comportament OK).
    cy.location("hash").should("eq", "#payment-redirect");
  });
});

