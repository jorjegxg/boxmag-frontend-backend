/**
 * Smoke subset for CI workflow_dispatch — home + i18n cookie redirect.
 * INV-I18N-COOKIE
 */

describe("Smoke", () => {
  it("loads home hero CTA", () => {
    cy.visit("/");
    cy.get("body").should("be.visible");
    cy.contains(/GET STARTED|Începe|Loslegen/i).should("exist");
  });

  it("redirects /ro/about to /about and sets language cookie", () => {
    cy.visit("/ro/about");
    cy.location("pathname").should("eq", "/about");
    cy.getCookie("boxmag.language").should("have.property", "value", "ro");
  });
});
