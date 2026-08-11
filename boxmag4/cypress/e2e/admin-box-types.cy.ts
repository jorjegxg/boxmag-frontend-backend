/**
 * E2E — admin creates box type, then header search on /shop finds it.
 *
 * Requires frontend (:3006), backend (:3005), MySQL, MinIO.
 */

const BACKEND_URL = String(
  Cypress.env("backendUrl") ?? "http://localhost:3005",
);

describe("Admin box types", () => {
  before(function () {
    cy.request({
      method: "GET",
      url: `${BACKEND_URL}/api/health`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        cy.log(
          `Skipping: backend unavailable at ${BACKEND_URL}/api/health (status ${response.status})`,
        );
        this.skip();
      }
    });
  });

  beforeEach(() => {
    cy.loginAdmin();
  });

  it("adds a box type in admin and finds it in shop header search", () => {
    const title = `Cypress Box ${Date.now()}`;

    cy.intercept("POST", "**/api/box-types/upload-images").as("uploadImages");
    cy.intercept({ method: "POST", url: /\/api\/box-types\/?(\?.*)?$/ }).as(
      "createBoxType",
    );
    cy.intercept("GET", "**/api/box-types").as("getBoxTypes");

    cy.visit("/admin/box-types");
    cy.wait("@getBoxTypes");

    cy.contains("label", "Titlu").find("input").clear().type(title);
    cy.get("#box-image-upload").selectFile("cypress/fixtures/box-type.png", {
      force: true,
    });
    cy.contains("button", "Adaugă tip de cutie").should("not.be.disabled").click();

    cy.wait("@uploadImages").its("response.statusCode").should("be.oneOf", [200, 201]);
    cy.wait("@createBoxType").its("response.statusCode").should("eq", 201);

    cy.contains("table tbody tr", title).within(() => {
      cy.contains(title).should("exist");
      cy.contains("Activ").should("exist");
    });

    cy.visit("/shop");
    cy.wait("@getBoxTypes");

    cy.get('form[role="search"] input[type="search"]').clear().type(title);
    cy.contains('p', "Box types", { timeout: 10000 }).should("exist");
    cy.get('form[role="search"]')
      .parent()
      .contains("a", title)
      .should("be.visible")
      .and("have.attr", "href")
      .and("match", /\/shop\?boxTypeId=\d+/);
  });
});
