/**
 * E2E – API failure resilience on shop / business / checkout
 */

describe("API failure resilience", () => {
  it("shop survives box-types 500 without crash", () => {
    cy.intercept("GET", "**/api/box-types", {
      statusCode: 500,
      body: { ok: false, message: "boom" },
    }).as("boxTypesFail");

    cy.visit("/shop");
    cy.wait("@boxTypesFail");
    cy.get("body").should("exist");
    cy.location("pathname").should("eq", "/shop");
    cy.get("p.text-red-600", { timeout: 10000 }).should("exist");
  });

  it("business survives box-types 500 without crash", () => {
    cy.intercept("GET", "**/api/box-types", {
      statusCode: 500,
      body: { ok: false, message: "boom" },
    }).as("boxTypesFail");

    cy.visit("/business");
    cy.wait("@boxTypesFail");
    cy.get("body").should("exist");
    cy.location("pathname").should("eq", "/business");
  });

  it("checkout survives shipping-methods 500", () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        "boxmag.cart",
        JSON.stringify({
          state: {
            items: [
              {
                itemNo: "STD-001",
                name: "Standard Box",
                unitPrice: 10,
                quantity: 100,
              },
            ],
            newCartItems: 1,
            subtotal: 1000,
            totalItems: 100,
          },
          version: 0,
        }),
      );
    });

    cy.intercept("GET", "**/api/shipping-methods*", {
      statusCode: 500,
      body: { ok: false },
    }).as("shippingFail");

    cy.visit("/checkout");
    cy.wait("@shippingFail");
    cy.get("body").should("exist");
    cy.location("pathname").should("eq", "/checkout");
  });
});
