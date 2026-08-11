/**
 * E2E — admin shipping methods UI (mocked API)
 */

const methods = [
  {
    id: 1,
    key: "standard",
    name: "Standard Delivery",
    etaText: "Estimated 7-10 days",
    price: 25,
    isActive: true,
    sortOrder: 1,
  },
];

describe("Admin shipping methods", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("loads shipping methods table", () => {
    cy.intercept("GET", "**/api/shipping-methods?includeInactive=true", {
      statusCode: 200,
      body: { ok: true, data: methods },
    }).as("getShipping");

    cy.visit("/admin/shipping-methods");
    cy.wait("@getShipping");
    cy.contains("Metode de livrare").should("exist");
    cy.get('input[value="standard"]').should("exist");
    cy.get('input[value="Standard Delivery"]').should("exist");
  });

  it("posts a new shipping method from the form", () => {
    cy.intercept("GET", "**/api/shipping-methods?includeInactive=true", {
      statusCode: 200,
      body: { ok: true, data: methods },
    }).as("getShipping");
    cy.intercept("POST", "**/api/shipping-methods", {
      statusCode: 201,
      body: {
        ok: true,
        data: {
          id: 9,
          key: "night",
          name: "Night",
          etaText: "Overnight",
          price: 55,
          isActive: true,
          sortOrder: 3,
        },
      },
    }).as("createShipping");

    cy.visit("/admin/shipping-methods");
    cy.wait("@getShipping");

    cy.get('input[placeholder="standard"]').clear().type("night");
    cy.get('input[placeholder="Livrare standard"]').clear().type("Night");
    cy.get('input[placeholder="Estimat 7-10 zile"]').clear().type("Overnight");
    cy.get('input[placeholder="25"]').clear().type("55");
    cy.get('input[placeholder="1"]').clear().type("3");
    cy.contains("button", "Adaugă metodă de livrare").click();

    cy.wait("@createShipping").its("request.body").should((body) => {
      expect(body.key).to.eq("night");
      expect(body.name).to.eq("Night");
      expect(body.price).to.eq(55);
    });
  });
});
