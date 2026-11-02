/**
 * E2E — admin customers + newsletter subscribers lists
 */

describe("Admin – clienți", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("listează clienții și caută pe server", () => {
    cy.intercept({ method: "GET", pathname: "/api/customers" }, {
      statusCode: 200,
      body: {
        ok: true,
        data: [
          {
            id: 1,
            email: "ana@example.com",
            firstName: "Ana",
            lastName: "Pop",
            companyName: "Ana SRL",
            vatNumber: "RO123",
            phone: "0700",
            isActive: true,
            emailVerifiedAt: "2026-01-01T00:00:00.000Z",
            lastLoginAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            ordersCount: 3,
          },
        ],
        meta: { total: 1, page: 1, pageSize: 20 },
      },
    }).as("getCustomers");

    cy.visit("/admin/customers");
    cy.wait("@getCustomers");
    cy.contains("tr", "Ana Pop").within(() => {
      cy.contains("ana@example.com").should("exist");
      cy.contains("Activ").should("exist");
    });

    cy.intercept({ method: "GET", pathname: "/api/customers", query: { q: "ana srl" } }).as(
      "searchCustomers",
    );
    cy.waitForHydration();
    cy.get("#customers-search").type("ana srl");
    cy.wait("@searchCustomers");
  });
});

describe("Admin – newsletter", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("listează abonații activi implicit și exportă CSV", () => {
    cy.intercept({ method: "GET", pathname: "/api/newsletter/subscribers" }, (req) => {
      if (req.query.format === "csv") {
        req.reply({
          statusCode: 200,
          headers: { "content-type": "text/csv; charset=utf-8" },
          body: "email,subscribed\r\nbuyer@example.com,yes\r\n",
        });
        return;
      }
      req.reply({
        statusCode: 200,
        body: {
          ok: true,
          data: [
            {
              id: 1,
              email: "buyer@example.com",
              subscribed: true,
              locale: "ro",
              source: "website-footer",
              unsubscribedAt: null,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          meta: { total: 1, page: 1, pageSize: 20 },
        },
      });
    }).as("subscribers");

    cy.visit("/admin/newsletter");
    cy.wait("@subscribers").its("request.url").should("include", "status=subscribed");
    cy.contains("tr", "buyer@example.com").should("contain", "Abonat");

    cy.intercept({
      method: "GET",
      pathname: "/api/newsletter/subscribers",
      query: { format: "csv" },
    }).as("exportCsv");
    cy.waitForHydration();
    cy.contains("button", "Export CSV").click();
    cy.wait("@exportCsv").its("request.url").should("include", "status=subscribed");
  });
});
