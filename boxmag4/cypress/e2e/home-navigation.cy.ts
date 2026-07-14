describe("Home page – hero configurator navigation", () => {
  it("navighează spre /business cu dimensiunile selectate", () => {
    cy.visit("/");

    cy.get('a[href^="/business?"]')
      .first()
      .should("have.attr", "href")
      .and("include", "length=400")
      .and("include", "width=400")
      .and("include", "height=400");

    cy.get('a[href^="/business?"]').first().click();
    cy.url().should("include", "/business?length=400&width=400&height=400");
  });
});
