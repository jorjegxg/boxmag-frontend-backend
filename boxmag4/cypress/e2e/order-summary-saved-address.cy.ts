/**
 * E2E – /order-summary saved address (logged-in B2B)
 *
 * Docs: cypress/documentation/order-summary-saved-address.md
 *
 * INV-B2B-SAVED-ADDRESS: logged-in user with account addresses can use
 * saved address (default) or another address; POST /api/orders uses active address.
 */

import {
  AUTH_EMAIL_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  TEST_EMAIL,
  sampleWarehouseAddress,
} from "../support/commands";
import {
  fillBusinessConfigurator,
  STORAGE_KEY,
} from "../support/b2b-guest-helpers";

const mockBoxTypes = [
  {
    id: 1,
    title: "Standard Boxes",
    isActive: true,
    images: [{ url: "/b2b/boxes/box.png", isPrimary: true }],
  },
];

const mockProfile = {
  firstName: "John",
  lastName: "Doe",
  phone: "799111222",
  email: TEST_EMAIL,
  companyName: "Boxmag SRL",
  vatNumber: "RO12345678",
};

describe("/order-summary – saved address (logged-in)", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/box-types*", {
      statusCode: 200,
      body: { ok: true, data: mockBoxTypes },
    }).as("getBoxTypes");

    cy.intercept("GET", "**/api/auth/profile*", {
      statusCode: 200,
      body: { ok: true, data: mockProfile },
    }).as("getOrderSummaryProfile");

    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: { ok: true, data: [sampleWarehouseAddress] },
    }).as("getOrderSummaryAddresses");

    cy.intercept("POST", "**/api/orders", (req) => {
      req.reply({
        statusCode: 201,
        body: { ok: true, data: { id: 9101 } },
      });
    }).as("createOrder");

    cy.visit("/business", {
      onBeforeLoad(win) {
        win.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        win.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, TEST_EMAIL);
        win.sessionStorage.removeItem(STORAGE_KEY);
      },
    });
    cy.wait("@getBoxTypes");
  });

  it("folosește adresa salvată by default și o trimite la POST /api/orders", () => {
    fillBusinessConfigurator();
    cy.contains("button", "NEXT").click();

    cy.location("pathname").should("eq", "/order-summary");
    cy.wait(["@getOrderSummaryProfile", "@getOrderSummaryAddresses"]);

    cy.get('[data-testid="os-saved-address-preview"]').should("exist");
    cy.get('[data-testid="os-saved-address-preview"]').within(() => {
      cy.contains("Ana Popescu").should("exist");
      cy.contains("Str. Depozit 15, Hala B").should("exist");
      cy.contains("725400").should("exist");
      cy.contains("Radauti").should("exist");
    });
    cy.get("#os-address").should("not.exist");
    cy.get('[data-testid="os-use-another-address"]').should("exist");

    cy.get("#os-email").should("have.value", TEST_EMAIL);
    cy.get("#os-companyName").should("not.have.value", "");

    cy.contains("button", "NEXT").click();
    cy.wait("@createOrder").then((interception) => {
      const body = interception.request.body as {
        email?: string;
        accountEmail?: string;
        address?: string;
        postcode?: string;
        city?: string;
        country?: string;
        phone?: string;
        companyName?: string;
      };
      expect(body.email).to.eq(TEST_EMAIL);
      expect(body.accountEmail).to.eq(TEST_EMAIL);
      expect(body.address).to.eq("Str. Depozit 15, Hala B");
      expect(body.postcode).to.eq("725400");
      expect(body.city).to.eq("Radauti");
      expect(body.country).to.eq("RO");
      expect(body.phone).to.eq("799111222");
      expect(body.companyName).to.eq("Boxmag SRL");
    });

    cy.location("pathname").should("eq", "/business/order-success");
  });

  it("permite altă adresă și o trimite la POST /api/orders", () => {
    fillBusinessConfigurator();
    cy.contains("button", "NEXT").click();

    cy.location("pathname").should("eq", "/order-summary");
    cy.wait(["@getOrderSummaryProfile", "@getOrderSummaryAddresses"]);

    cy.get('[data-testid="os-use-another-address"]').click();
    cy.get("#os-address").should("be.visible");
    cy.get('[data-testid="os-use-saved-address"]').should("exist");
    cy.get('[data-testid="os-saved-address-preview"]').should("not.exist");

    cy.get("#os-address").clear().type("Str. Manuala 99");
    cy.get("#os-postcode").clear().type("400000");
    cy.get("#os-city").clear().type("Cluj-Napoca");
    cy.get("#os-country").select("RO");

    cy.contains("button", "NEXT").click();
    cy.wait("@createOrder").then((interception) => {
      const body = interception.request.body as {
        address?: string;
        postcode?: string;
        city?: string;
        country?: string;
      };
      expect(body.address).to.eq("Str. Manuala 99");
      expect(body.postcode).to.eq("400000");
      expect(body.city).to.eq("Cluj-Napoca");
      expect(body.country).to.eq("RO");
    });
  });
});
