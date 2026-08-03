/**
 * E2E tests – /checkout
 *
 * Docs: cypress/documentation/checkout.md
 *
 * Focus: empty cart, guest/logged-in place order, VAT, shipping totals,
 * payload shape (email + address). Stripe redirect + webhook are mocked —
 * confirmation emails fire server-side only after payment is marked paid
 * (webhook OR GET /api/payments/sessions/:id on success page).
 */

import { TEST_EMAIL, sampleWarehouseAddress } from "../support/commands";

const fillManualAddress = (overrides: Partial<Record<string, string>> = {}) => {
  const data = {
    firstName: "Elena",
    lastName: "Marin",
    addressLine1: "Str. Test 7",
    addressLine2: "",
    postcode: "725400",
    city: "Radauti",
    country: "RO",
    phone: "799888777",
    ...overrides,
  };

  // Company name is read-only — filled by VAT lookup into #checkout-companyName
  cy.get('input[placeholder="First name"]').clear().type(data.firstName);
  cy.get('input[placeholder="Last name"]').clear().type(data.lastName);
  cy.get('input[placeholder="Address line 1"]').clear().type(data.addressLine1);
  if (data.addressLine2) {
    cy.get('input[placeholder="Address line 2 (optional)"]').clear().type(data.addressLine2);
  }
  cy.get('input[placeholder="Postcode"]').clear().type(data.postcode);
  cy.get('input[placeholder="City"]').clear().type(data.city);
  cy.get('input[placeholder="Country"]').clear().type(data.country);
  cy.get('input[placeholder="Phone"]').clear().type(data.phone);
};

const fillGuestEmail = (email = "guest.buyer@example.com") => {
  cy.get('input[placeholder="Email address"]').clear().type(email);
};

const mockVatLookup = (
  body: { ok: boolean; companyName?: string; vatNumber?: string; message?: string } = {
    ok: true,
    companyName: "Boxmag SRL",
    vatNumber: "RO12345678",
  },
) => {
  cy.intercept("GET", "**/api/vat-lookup*", {
    statusCode: 200,
    body,
  }).as("vatLookup");
};

const fillValidVat = (
  vat = "RO12345678",
  options: { expectCompany?: string | null } = {},
) => {
  const expectCompany = options.expectCompany === undefined
    ? "Boxmag SRL"
    : options.expectCompany;

  mockVatLookup({
    ok: true,
    companyName: expectCompany || "Boxmag SRL",
    vatNumber: vat,
  });
  cy.get("#checkout-vatNumber").clear().type(vat, { delay: 0 });

  // VAT lookup fires after a 600ms debounce — wait for the actual request so
  // we don't race ahead of it (a passing "not.exist" check can be a false
  // negative if the debounce simply hasn't fired yet).
  cy.wait("@vatLookup", { timeout: 15000 });

  // Company input is read-only and only fills from VAT lookup/cache.
  // With a saved address, place-order can still use selectedAddress.companyName,
  // so callers may skip this assert via expectCompany: null.
  if (expectCompany) {
    cy.get("#checkout-companyName", { timeout: 15000 }).should(
      "have.value",
      expectCompany,
    );
  }
  cy.contains(/verify the VAT number|verificăm numărul de TVA/i, {
    timeout: 15000,
  }).should("not.exist");
};

describe("/checkout", () => {
  it("afișează mesajul de coș gol când nu există produse", () => {
    cy.visitCheckoutLoggedOut({ cartItems: [] });
    cy.contains("Cart is empty.").should("exist");
  });

  it("cere email obligatoriu la guest checkout", () => {
    cy.visitCheckoutLoggedOut();
    fillManualAddress();
    fillValidVat();
    cy.contains("button", "Place order").click();
    cy.contains("Please enter your email address.").should("exist");
  });

  it("blochează place order când VAT e invalid", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });
    cy.get("#checkout-vatNumber").clear().type("!", { delay: 0 });
    cy.contains("button", "Place order").click();
    cy.contains(/VAT number must be in a valid format|Codul TVA trebuie să fie/i).should(
      "exist",
    );
  });

  it("blochează place order când VAT lipsește", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });
    cy.get("#checkout-vatNumber").clear();
    cy.contains("button", "Place order").click();
    cy.contains(/VAT number is required|Codul TVA este obligatoriu/i).should("exist");
  });

  it("căutarea VAT completează automat numele firmei", () => {
    cy.visitCheckoutLoggedOut();
    fillGuestEmail();
    fillManualAddress();
    fillValidVat("RO12345678");
    cy.get("#checkout-companyName").should("have.value", "Boxmag SRL");
  });

  it("selectarea metodei de shipping actualizează totalul comenzii", () => {
    // Default cart: 12.5 × 100 = 1250; VAT 21% = 262.50
    // Standard shipping 25 → total 1537.50
    // Express shipping 40 → total 1552.50
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });

    cy.contains("Express Delivery").click();
    cy.contains("€ 1552.50").should("exist");

    cy.contains("Own transport").click();
    cy.contains("€ 1512.50").should("exist");

    cy.contains("Standard Delivery").click();
    cy.contains("€ 1537.50").should("exist");
  });

  it("permite guest checkout când nu ești logat și ai introdus email", () => {
    cy.visitCheckoutLoggedOut();
    fillGuestEmail("guest.buyer@example.com");
    fillManualAddress();
    fillValidVat();

    cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
      expect(req.body.email).to.eq("guest.buyer@example.com");
      expect(req.body.vatNumber).to.eq("RO12345678");
      expect(req.body.address.firstName).to.eq("Elena");
      expect(req.body.address.lastName).to.eq("Marin");
      expect(req.body.consentEmail).to.eq(true);
      req.reply({
        statusCode: 200,
        body: { ok: true, data: { url: "/checkout#payment-redirect", orderId: 6 } },
      });
    }).as("createCheckoutGuest");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckoutGuest");
    cy.location("hash").should("eq", "#payment-redirect");
  });

  it("când ești logat dar fără adrese, cere adresă manuală și validează incomplete address", () => {
    cy.visitCheckoutLoggedIn({ addresses: [] });

    cy.contains("Fill the form below with a new shipping address.").should("exist");
    cy.contains("button", "Place order").click();
    cy.contains("Please complete shipping address details.").should("exist");
  });

  it("trimite create-checkout-session cu adresă manuală când nu ai adrese salvate", () => {
    cy.visitCheckoutLoggedIn({ addresses: [] });
    cy.contains("Fill the form below with a new shipping address.").should("exist");
    cy.get('input[placeholder="First name"]').should("be.visible");

    fillManualAddress();
    fillValidVat();

    cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
      expect(req.body.email).to.eq(TEST_EMAIL);
      expect(req.body.address.firstName).to.eq("Elena");
      expect(req.body.address.lastName).to.eq("Marin");
      expect(req.body.address.address).to.eq("Str. Test 7");
      expect(req.body.address.postcode).to.eq("725400");
      expect(req.body.address.city).to.eq("Radauti");
      expect(req.body.address.country).to.eq("RO");
      expect(req.body.shipping.name).to.eq("Standard Delivery");
      req.reply({
        statusCode: 200,
        body: { ok: true, data: { url: "/checkout#payment-redirect", orderId: 7 } },
      });
    }).as("createCheckout");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckout", { timeout: 15000 });
    cy.location("hash").should("eq", "#payment-redirect");
  });

  it("trimite create-checkout-session cu adresa salvată când există addresses", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });
    fillValidVat();

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

  it("trimite shipping express în create-checkout-session când e selectat", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });
    fillValidVat();
    cy.contains("Express Delivery").click();

    cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
      expect(req.body.shipping.key).to.eq("express");
      expect(req.body.shipping.name).to.eq("Express Delivery");
      expect(req.body.shipping.price).to.eq(40);
      req.reply({
        statusCode: 200,
        body: { ok: true, data: { url: "/checkout#payment-redirect", orderId: 10 } },
      });
    }).as("createCheckoutExpress");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckoutExpress");
  });

  it("afișează eroare când create-checkout-session eșuează", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });
    fillValidVat();

    cy.intercept("POST", "**/api/payments/create-checkout-session", {
      statusCode: 500,
      body: { ok: false, message: "Server error" },
    }).as("createCheckoutFail");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckoutFail");
    cy.contains("Server error").should("exist");
  });

  it("butonul Place order arată stare submitting în timpul request-ului", () => {
    cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });
    // Saved address already has companyName — skip flake on read-only VAT company field
    fillValidVat("RO12345678", { expectCompany: null });

    cy.intercept("POST", "**/api/payments/create-checkout-session", {
      delay: 2000,
      statusCode: 200,
      body: { ok: true, data: { url: "/checkout#payment-redirect", orderId: 9 } },
    }).as("slowCheckout");

    cy.contains("button", "Place order").click();
    cy.contains("button", "Placing order...").should("be.disabled");
    cy.wait("@slowCheckout");
    cy.location("hash").should("eq", "#payment-redirect");
  });
});
