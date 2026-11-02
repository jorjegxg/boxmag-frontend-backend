/**
 * E2E — newsletter unsubscribe page (INV-NEWSLETTER-UNSUB) + 404 page
 */

describe("/newsletter/unsubscribe", () => {
  it("cere confirmare explicită și apoi dezabonează", () => {
    cy.intercept("POST", "**/api/newsletter/unsubscribe", {
      statusCode: 200,
      body: { ok: true, data: { email: "buyer@example.com" } },
    }).as("unsubscribe");

    cy.visit("/newsletter/unsubscribe?email=buyer%40example.com&token=abc");
    cy.waitForHydration();
    cy.contains("Stop sending Boxmag newsletter emails to buyer@example.com?").should("exist");
    // Nothing happens on load: link scanners must not unsubscribe people.
    cy.get("@unsubscribe.all").should("have.length", 0);

    cy.contains("button", "Unsubscribe").click();
    cy.wait("@unsubscribe").its("request.body").should("deep.equal", {
      email: "buyer@example.com",
      token: "abc",
    });
    cy.contains("You are unsubscribed").should("exist");
  });

  it("link fără token → mesaj de link invalid, fără buton", () => {
    cy.visit("/newsletter/unsubscribe?email=buyer%40example.com");
    cy.contains("This unsubscribe link is invalid.").should("exist");
    cy.contains("button", "Unsubscribe").should("not.exist");
  });

  it("token respins de server → mesaj de link invalid", () => {
    cy.intercept("POST", "**/api/newsletter/unsubscribe", {
      statusCode: 400,
      body: { ok: false, message: "Invalid unsubscribe link" },
    }).as("unsubscribeFail");

    cy.visit("/newsletter/unsubscribe?email=buyer%40example.com&token=bad");
    cy.waitForHydration();
    cy.contains("button", "Unsubscribe").click();
    cy.wait("@unsubscribeFail");
    cy.contains("Unsubscribe failed").should("exist");
    cy.contains("This unsubscribe link is invalid.").should("exist");
  });
});

describe("404", () => {
  it("rută inexistentă → pagina 404 cu status 404", () => {
    cy.request({ url: "/aceasta-pagina-nu-exista", failOnStatusCode: false })
      .its("status")
      .should("eq", 404);
    cy.visit("/aceasta-pagina-nu-exista", { failOnStatusCode: false });
    cy.contains("Page not found").should("exist");
    cy.contains("a", "Back to home").should("have.attr", "href", "/");
  });
});
