/**
 * E2E — admin login + middleware redirect (INV-AUTH-ADMIN)
 */

describe("Admin login", () => {
  it("redirects unauthenticated /admin/orders to login with next=", () => {
    cy.clearCookies();
    cy.visit("/admin/orders");
    cy.location("pathname").should("eq", "/admin/login");
    cy.location("search").should("include", "next=");
    cy.contains("h1", "Acces admin").should("exist");
  });

  it("shows error on wrong password", () => {
    cy.intercept("POST", "/api/admin/auth", {
      statusCode: 401,
      body: { ok: false, message: "Parolă incorectă." },
    }).as("adminAuthFail");

    cy.visit("/admin/login");
    cy.get("#admin-password").type("wrong-password");
    cy.contains("button", "Autentificare").click();
    cy.wait("@adminAuthFail");
    cy.contains("Parolă incorectă").should("exist");
    cy.location("pathname").should("eq", "/admin/login");
  });

  it("logs in via form and reaches admin area", () => {
    cy.loginAdmin();
    cy.intercept({ method: "GET", pathname: "/api/orders" }, {
      statusCode: 200,
      body: { ok: true, data: [] },
    }).as("getOrders");
    cy.visit("/admin");
    cy.location("pathname").should("eq", "/admin/orders");
    cy.wait("@getOrders");
    cy.contains("Comenzi").should("exist");
  });

  it("logs out and loses access to the admin area", () => {
    cy.loginAdmin();
    cy.intercept({ method: "GET", pathname: "/api/orders" }, {
      statusCode: 200,
      body: { ok: true, data: [] },
    });
    cy.intercept("DELETE", "/api/admin/auth").as("logout");
    cy.visit("/admin/orders");
    cy.waitForHydration();
    cy.contains("button", "Deconectare").click();
    cy.wait("@logout").its("response.statusCode").should("eq", 200);
    cy.location("pathname").should("eq", "/admin/login");
    cy.getCookie("boxmag-admin-session").should("not.exist");

    cy.visit("/admin/orders");
    cy.location("pathname").should("eq", "/admin/login");
  });
});
