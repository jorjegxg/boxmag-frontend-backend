/**
 * E2E – Monedă EUR / RON
 *
 * Docs: cypress/documentation/currency-eur-ron.md
 *
 * Scenarii:
 *  1. TopBar → RON: prețuri reformate pe shop, PDP, checkout
 *  2. Mount apelează /api/exchange-rate/eur-ron; RON folosește rate
 *  3. Eșec API curs → fallback grațios (sumă EUR + suffix lei)
 *  4. Moneda persistă în localStorage după reload
 *  5. Checkout Place order trimite currency: ron
 */

import {
  AUTH_EMAIL_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  CART_STORAGE_KEY,
  sampleWarehouseAddress,
  TEST_EMAIL,
  VAT_COMPANY_CACHE_KEY,
} from "../support/commands";

const CURRENCY_STORAGE = "boxmag.currency";
const MOCK_RATE = 5;
const UNIT_WITH_TAX = 11.9;

const currencySelect = () =>
  cy.contains("span", /Currency|Monedă|Währung/i).parent().find("select");

const mockExchangeRate = (rate = MOCK_RATE) => {
  cy.intercept("GET", "**/api/exchange-rate/eur-ron", {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        rate,
        source: "cypress-mock",
        fetchedAt: new Date().toISOString(),
      },
    },
  }).as("getExchangeRate");
};

const mockExchangeRateFail = () => {
  cy.intercept("GET", "**/api/exchange-rate/eur-ron", {
    statusCode: 500,
    body: { ok: false, message: "rate unavailable" },
  }).as("getExchangeRateFail");
};

const mockCatalog = () => {
  cy.intercept("GET", "**/api/box-types", {
    statusCode: 200,
    body: {
      ok: true,
      data: [
        {
          id: 1,
          title: "Standard Boxes",
          key: "standard",
          images: [
            {
              id: 11,
              url: "/b2b/boxes/box.png",
              sortOrder: 1,
              altText: null,
              isPrimary: true,
            },
          ],
          isActive: true,
        },
      ],
    },
  }).as("getBoxTypes");

  cy.intercept("GET", "**/api/box-types/*/products", {
    statusCode: 200,
    body: {
      ok: true,
      data: [
        {
          id: 101,
          boxTypeId: 1,
          itemNo: "STD-001",
          productName: "Standard Box 300x200",
          internalDimensionsMM: { l: 300, w: 200, h: 150 },
          prices: [
            {
              id: 1,
              name: "300",
              withoutTax: 10,
              withTax: UNIT_WITH_TAX,
            },
          ],
        },
      ],
    },
  }).as("getProducts");
};

const visitWithCurrency = (
  path: string,
  currency: "eur" | "ron" = "eur",
) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(CURRENCY_STORAGE, currency);
    },
  });
};

const seedRonCart = () =>
  JSON.stringify({
    state: {
      items: [
        {
          itemNo: "BOX-001",
          name: "Custom Box 300x200",
          unitPrice: 12.5,
          quantity: 100,
          imageUrl: "/b2b/boxes/box.png",
        },
      ],
      newCartItems: 100,
      subtotal: 1250,
      totalItems: 100,
    },
    version: 0,
  });

describe("Monedă EUR / RON", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("switch TopBar la RON — prețurile se reformatează pe shop, PDP, checkout", () => {
    mockExchangeRate();
    mockCatalog();

    visitWithCurrency("/shop", "eur");
    cy.wait(["@getExchangeRate", "@getBoxTypes", "@getProducts"]);

    currencySelect().should("have.value", "EUR");
    cy.contains(`from € ${UNIT_WITH_TAX.toFixed(2)}`).should("be.visible");

    currencySelect().select("RON");
    currencySelect().should("have.value", "RON");
    cy.contains(`from ${(UNIT_WITH_TAX * MOCK_RATE).toFixed(2)} lei`).should(
      "be.visible",
    );

    cy.visit("/products/standard?itemNo=STD-001");
    cy.wait(["@getExchangeRate", "@getBoxTypes", "@getProducts"]);
    currencySelect().should("have.value", "RON");
    // PDP: unit × qty 100 × rate
    cy.contains(`${(UNIT_WITH_TAX * 100 * MOCK_RATE).toFixed(2)} lei`).should(
      "be.visible",
    );

    cy.mockCheckoutApis();
    cy.visit("/checkout", {
      onBeforeLoad(win) {
        win.localStorage.setItem(CURRENCY_STORAGE, "ron");
        win.localStorage.setItem(CART_STORAGE_KEY, seedRonCart());
      },
    });
    cy.wait(["@getExchangeRate", "@getShippingMethods"]);
    currencySelect().should("have.value", "RON");
    // subtotal 12.5 × 100 × 5
    cy.contains(`${(1250 * MOCK_RATE).toFixed(2)} lei`).should("be.visible");
  });

  it("modul RON apelează /api/exchange-rate/eur-ron și aplică rate-ul", () => {
    mockExchangeRate(4);
    mockCatalog();

    visitWithCurrency("/shop", "eur");
    cy.wait("@getExchangeRate");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    currencySelect().select("RON");
    cy.contains(`from ${(UNIT_WITH_TAX * 4).toFixed(2)} lei`).should(
      "be.visible",
    );
  });

  it("eșec API curs de schimb — fallback grațios (sumă EUR + lei)", () => {
    mockExchangeRateFail();
    mockCatalog();

    visitWithCurrency("/shop", "eur");
    cy.wait(["@getExchangeRateFail", "@getBoxTypes", "@getProducts"]);

    currencySelect().select("RON");
    currencySelect().should("have.value", "RON");
    cy.contains(`from ${UNIT_WITH_TAX.toFixed(2)} lei`).should("be.visible");
    cy.contains(/from € /).should("not.exist");
  });

  it("moneda persistă în localStorage după reload", () => {
    mockExchangeRate();
    mockCatalog();

    visitWithCurrency("/shop", "eur");
    cy.wait(["@getExchangeRate", "@getBoxTypes", "@getProducts"]);

    currencySelect().select("RON");
    cy.window().then((win) => {
      expect(win.localStorage.getItem(CURRENCY_STORAGE)).to.eq("ron");
    });

    cy.reload();
    cy.wait(["@getExchangeRate", "@getBoxTypes", "@getProducts"]);

    currencySelect().should("have.value", "RON");
    cy.contains(`from ${(UNIT_WITH_TAX * MOCK_RATE).toFixed(2)} lei`).should(
      "be.visible",
    );
    cy.window().then((win) => {
      expect(win.localStorage.getItem(CURRENCY_STORAGE)).to.eq("ron");
    });
  });

  it("checkout Place order trimite currency: ron", () => {
    mockExchangeRate();
    cy.mockCheckoutApis();
    cy.intercept("GET", "**/api/addresses*", {
      statusCode: 200,
      body: { ok: true, data: [sampleWarehouseAddress] },
    }).as("getCheckoutAddresses");
    cy.intercept("GET", "**/api/auth/profile*", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          firstName: "John",
          lastName: "Doe",
          phone: "799111222",
          email: TEST_EMAIL,
          companyName: "Boxmag SRL",
          vatNumber: "RO12345678",
        },
      },
    }).as("getCheckoutProfile");

    cy.visit("/checkout", {
      onBeforeLoad(win) {
        win.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        win.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, TEST_EMAIL);
        win.localStorage.setItem(CURRENCY_STORAGE, "ron");
        win.localStorage.setItem(CART_STORAGE_KEY, seedRonCart());
        win.localStorage.removeItem(VAT_COMPANY_CACHE_KEY);
      },
    });
    cy.wait([
      "@getExchangeRate",
      "@getShippingMethods",
      "@getCheckoutAddresses",
      "@getCheckoutProfile",
    ]);

    currencySelect().should("have.value", "RON");
    // Profile seeds VAT + company (cache); no need to re-type / wait lookup.
    cy.get("#checkout-vatNumber").should("have.value", "RO12345678");
    cy.get("#checkout-companyName").should("have.value", "Boxmag SRL");

    cy.intercept("POST", "**/api/payments/create-checkout-session", (req) => {
      expect(req.body.currency).to.eq("ron");
      expect(req.body.shipping.key).to.eq("standard");
      req.reply({
        statusCode: 200,
        body: {
          ok: true,
          data: { url: "/checkout#payment-redirect", orderId: 42 },
        },
      });
    }).as("createCheckoutRon");

    cy.contains("button", "Place order").click();
    cy.wait("@createCheckoutRon");
  });
});
