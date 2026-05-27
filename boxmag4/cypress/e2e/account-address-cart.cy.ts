/**
 * E2E – adrese din /account apar în coș (/checkout)
 *
 * Flux: salvare adresă în cont → afișare în Shipping Information la checkout
 */

import {
  sampleHomeAddress,
  sampleWarehouseAddress,
  TEST_EMAIL,
} from "../support/commands";

const fillAccountAddressForm = () => {
  cy.get('input[placeholder="Label (Home, Warehouse...)"]').type("Cart Test");
  cy.get('input[placeholder="Company Name"]').type("Boxmag SRL");
  cy.get('input[placeholder="First Name *"]').type("Elena");
  cy.get('input[placeholder="Last Name *"]').type("Marin");
  cy.get('input[placeholder="Phone"]').type("799888777");
  cy.get('input[placeholder="Address line 1 *"]').type("Str. Coșului 7");
  cy.get('input[placeholder="Postcode *"]').type("725400");
  cy.get('input[placeholder="City *"]').type("Radauti");
  cy.get('input[placeholder="Country *"]').type("RO");
};

const newAddressFromAccount: typeof sampleWarehouseAddress = {
  id: 10,
  label: "Cart Test",
  companyName: "Boxmag SRL",
  firstName: "Elena",
  lastName: "Marin",
  phone: "799888777",
  addressLine1: "Str. Coșului 7",
  addressLine2: "",
  postcode: "725400",
  city: "Radauti",
  country: "RO",
  isDefaultBilling: true,
  isDefaultShipping: true,
};

// ---------------------------------------------------------------------------

describe("Account address → checkout (coș)", () => {
  describe("checkout fără adrese salvate", () => {
    it("afișează formular manual când utilizatorul nu e logat", () => {
      cy.visitCheckoutLoggedOut();

      cy.contains("h2", "Shipping Information").should("exist");
      cy.contains("Fill the form below with a new shipping address.").should("exist");
      cy.get('input[placeholder="First name"]').should("exist");
      cy.contains("SELECT ADDRESS:").should("not.exist");
    });

    it("afișează formular manual când e logat dar fără adrese", () => {
      cy.visitCheckoutLoggedIn({ addresses: [] });

      cy.contains("Fill the form below with a new shipping address.").should("exist");
      cy.contains("Use saved address").should("not.exist");
      cy.get('a[href="/account"]').should("exist");
    });
  });

  describe("adrese salvate în checkout", () => {
    it("afișează adresa default shipping din cont în coș", () => {
      cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });

      cy.contains("Ana Popescu").should("exist");
      cy.contains("Boxmag SRL").should("exist");
      cy.contains("Str. Depozit 15").should("exist");
      cy.contains("Hala B").should("exist");
      cy.contains("725400 Radauti").should("exist");
      cy.contains("RO").should("exist");
      cy.contains("Tel: 799111222").should("exist");
      cy.contains("SELECT ADDRESS:").should("exist");
      cy.contains("Company address uses your default shipping address.").should("exist");
    });

    it("folosește adresa default shipping, nu pe celelalte", () => {
      cy.visitCheckoutLoggedIn({
        addresses: [sampleHomeAddress, sampleWarehouseAddress],
      });

      cy.contains("Str. Depozit 15").should("exist");
      cy.contains("Ana Popescu").should("exist");
      cy.contains("Str. Acasa 3").should("not.exist");
      cy.contains("Ion Vasilescu").should("not.exist");
    });

    it("permite comutarea la adresă manuală și înapoi la cea salvată", () => {
      cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });

      cy.contains("Use a different address").click();
      cy.get('input[placeholder="First name"]').should("exist");
      cy.contains("Str. Depozit 15").should("not.exist");

      cy.contains("Use saved address").click();
      cy.contains("Str. Depozit 15").should("exist");
      cy.contains("Ana Popescu").should("exist");
    });

    it("linkul Manage account duce la /account", () => {
      cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });
      cy.contains("h2", "Shipping Information")
        .parent()
        .contains("a", "MANAGE ACCOUNT")
        .click();
      cy.location("pathname").should("eq", "/account");
    });
  });

  describe("flux account → checkout", () => {
    it("adresa salvată în account apare în coș după salvare", () => {
      cy.mockAccountApis({ addresses: [] });
      cy.mockCheckoutApis();

      cy.intercept("POST", "**/api/addresses", {
        statusCode: 200,
        body: { ok: true },
      }).as("createAddress");

      cy.intercept("GET", "**/api/addresses*", {
        statusCode: 200,
        body: { ok: true, data: [newAddressFromAccount] },
      }).as("getAddresses");

      // 1. Salvează adresa în cont
      cy.visit("/account", {
        onBeforeLoad(win) {
          win.localStorage.setItem("boxmag.auth.loggedIn", "true");
          win.localStorage.setItem("boxmag.auth.email", TEST_EMAIL);
          win.localStorage.setItem(
            "boxmag.cart",
            JSON.stringify({
              state: {
                items: [
                  {
                    itemNo: "BOX-001",
                    name: "Custom Box",
                    unitPrice: 12.5,
                    quantity: 1,
                  },
                ],
                newCartItems: 1,
                subtotal: 12.5,
                totalItems: 1,
              },
              version: 0,
            }),
          );
        },
      });
      cy.wait("@getAddresses");

      cy.openAccountTab("address");
      fillAccountAddressForm();
      cy.contains("button", "Save address").click();
      cy.wait("@createAddress");
      cy.wait("@getAddresses");
      cy.contains("Elena Marin").should("exist");
      cy.contains("Str. Coșului 7").should("exist");

      // 2. Mergi la coș – aceeași adresă trebuie să apară
      cy.visit("/checkout");
      cy.wait(["@getShippingMethods", "@getAddresses"]);

      cy.contains("Elena Marin").should("exist");
      cy.contains("Str. Coșului 7").should("exist");
      cy.contains("725400 Radauti").should("exist");
      cy.contains("Tel: 799888777").should("exist");
    });

    it("ștergerea adresei din account o elimină din checkout", () => {
      cy.mockAccountApis({ addresses: [newAddressFromAccount] });
      cy.mockCheckoutApis();

      cy.intercept("DELETE", "**/api/addresses/10*", {
        statusCode: 200,
        body: { ok: true },
      }).as("deleteAddress");

      cy.visitAccountLoggedIn({ addresses: [newAddressFromAccount] });
      cy.openAccountTab("address");

      cy.intercept("GET", "**/api/addresses*", {
        statusCode: 200,
        body: { ok: true, data: [] },
      }).as("getAddressesAfterDelete");

      cy.contains("button", "Delete").click();
      cy.wait("@deleteAddress");
      cy.wait("@getAddressesAfterDelete");
      cy.contains("No saved addresses yet.").should("exist");

      cy.visitCheckoutLoggedIn({ addresses: [] });
      cy.contains("Fill the form below with a new shipping address.").should("exist");
      cy.contains("Str. Coșului 7").should("not.exist");
    });
  });

  describe("place order cu adresa din cont", () => {
    it("trimite adresa salvată la create-checkout-session", () => {
      cy.visitCheckoutLoggedIn({ addresses: [sampleWarehouseAddress] });

      cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
        expect(req.body.address.firstName).to.eq("Ana");
        expect(req.body.address.lastName).to.eq("Popescu");
        expect(req.body.address.address).to.eq("Str. Depozit 15");
        expect(req.body.address.city).to.eq("Radauti");
        expect(req.body.address.country).to.eq("RO");
        expect(req.body.email).to.eq(TEST_EMAIL);

        req.reply({
          statusCode: 200,
          body: {
            ok: true,
            data: { url: "/checkout#payment-redirect", orderId: 1 },
          },
        });
      }).as("createCheckout");

      cy.contains("button", "Place order").click();
      cy.wait("@createCheckout");
      cy.location("hash").should("eq", "#payment-redirect");
    });
  });
});
