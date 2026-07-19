/**
 * E2E tests – /order-summary flow guard
 *
 * Acoperă:
 * - Acces direct la /order-summary fără draft B2B redirecționează la /business
 *   (business_store / business_order_store nu sunt persistate, deci un load
 *   direct al paginii pornește mereu fără draft)
 */

describe("/order-summary – flow guard", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/box-types", { statusCode: 200, body: { ok: true, data: [] } });
  });

  it("acces direct fără draft B2B redirecționează la /business", () => {
    cy.visit("/order-summary");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/business");
  });

  it("nu randează bara Order Summary înainte de redirect", () => {
    cy.visit("/order-summary");
    cy.contains("Order Summary").should("not.exist");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/business");
  });
});
