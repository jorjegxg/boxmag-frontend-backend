/**
 * E2E – /order-summary edge cases: consent, API fail, attachment payload
 */

const VAT_NUMBER = "RO2816464";
const COMPANY_NAME = "Boxmag Demo SRL";
const STORAGE_KEY = "boxmag.b2b.orderSuccess";

const mockBoxTypes = [
  {
    id: 1,
    title: "Standard Boxes",
    isActive: true,
    images: [{ url: "/b2b/boxes/box.png", isPrimary: true }],
  },
];

const setTermsAccepted = (accepted: boolean) => {
  cy.get("#terms-checkbox-basic").then(($el) => {
    const isChecked = $el.attr("aria-checked") === "true";
    if (isChecked !== accepted) {
      cy.wrap($el).click({ force: true });
    }
  });
};

const selectProductCard = (sectionId: string, label: string) => {
  cy.get(`#${sectionId}`)
    .contains(label)
    .closest('[role="button"]')
    .click();
};

const fillBusinessStep = () => {
  selectProductCard("section-box-type-cards", "Standard Boxes");
  selectProductCard("section-cardboard-type-cards", "B Wave");
  selectProductCard("section-cardboard-color-cards", "Brown On Both Side");
  cy.get("#section-box-print-cards").contains("button", "No Color").click();
  cy.get("#section-size-type-cards")
    .contains("button", "Internal Size - mm")
    .click();
  cy.contains("button", "Own").click();
  cy.get("#package-length").clear().type("400");
  cy.get("#package-width").clear().type("300");
  cy.get("#package-height").clear().type("200");
  cy.get("#boxes-quantity").clear().type("500");
  cy.get('textarea[placeholder*="message"]')
    .clear()
    .type("Cypress order-summary edges.");
  setTermsAccepted(true);
};

const goToOrderSummary = () => {
  cy.window().then((win) => {
    win.localStorage.removeItem("boxmag.auth.loggedIn");
    win.localStorage.removeItem("boxmag.auth.email");
    win.sessionStorage.removeItem(STORAGE_KEY);
  });

  cy.intercept("GET", "**/api/box-types", {
    statusCode: 200,
    body: { ok: true, data: mockBoxTypes },
  }).as("getBoxTypes");
  cy.intercept("GET", "**/api/vat-lookup*", {
    statusCode: 200,
    body: { ok: true, companyName: COMPANY_NAME },
  }).as("vatLookup");

  cy.visit("/business");
  cy.wait("@getBoxTypes");
  fillBusinessStep();
  cy.contains("button", "NEXT").click();
  cy.location("pathname").should("eq", "/order-summary");
};

const fillContact = () => {
  cy.get("#os-firstName").clear().type("Ion");
  cy.get("#os-surname").clear().type("Popescu");
  cy.get("#os-vatNumber").clear().type(VAT_NUMBER);
  cy.wait("@vatLookup");
  cy.get("#os-companyName").should("have.value", COMPANY_NAME);
  cy.get("#os-email").clear().type("edges@example.com");
  cy.get("#os-phone").clear().type("+40799111222");
  cy.get("#os-address").clear().type("Str. Test 10");
  cy.get("#os-postcode").clear().type("010101");
  cy.get("#os-city").clear().type("Bucuresti");
  cy.get("#os-country").select("RO");
};

describe("/order-summary edges", () => {
  it("requires phone and email consent before submit", () => {
    goToOrderSummary();
    fillContact();

    cy.get('input[type="checkbox"]').eq(0).uncheck({ force: true });
    cy.get('input[type="checkbox"]').eq(1).uncheck({ force: true });

    cy.contains("button", "NEXT").click();
    cy.contains("Please accept phone consent before sending.").should("exist");
  });

  it("shows error when POST /api/orders fails", () => {
    goToOrderSummary();
    fillContact();

    cy.intercept("POST", "**/api/orders", {
      statusCode: 500,
      body: { ok: false, message: "Failed to create order" },
    }).as("createOrderFail");

    cy.contains("button", "NEXT").click();
    cy.wait("@createOrderFail");
    cy.contains(/failed|error|nu s-a putut|Failed to create/i).should("exist");
    cy.location("pathname").should("eq", "/order-summary");
  });

  it("includes attachment fields in POST /api/orders body", () => {
    cy.window().then((win) => {
      win.localStorage.removeItem("boxmag.auth.loggedIn");
      win.localStorage.removeItem("boxmag.auth.email");
      win.sessionStorage.removeItem(STORAGE_KEY);
    });

    cy.intercept("GET", "**/api/box-types", {
      statusCode: 200,
      body: { ok: true, data: mockBoxTypes },
    }).as("getBoxTypes");
    cy.intercept("GET", "**/api/vat-lookup*", {
      statusCode: 200,
      body: { ok: true, companyName: COMPANY_NAME },
    }).as("vatLookup");
    cy.intercept("POST", "**/api/orders", {
      statusCode: 201,
      body: { ok: true, data: { id: 901, orderNumber: "ORD-0901" } },
    }).as("createOrder");

    cy.visit("/business");
    cy.wait("@getBoxTypes");
    fillBusinessStep();

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from("pdf-bytes"),
        fileName: "specs.pdf",
        mimeType: "application/pdf",
      },
      { force: true },
    );
    cy.contains("specs.pdf").should("exist");
    cy.get('[data-testid="attachment-reading"]').should("not.exist");
    cy.contains("button", "NEXT").should("not.be.disabled").click();
    cy.location("pathname").should("eq", "/order-summary");
    fillContact();

    cy.contains("button", "NEXT").click();
    cy.wait("@createOrder").its("request.body").should((body) => {
      const payload = typeof body === "string" ? JSON.parse(body) : body;
      expect(payload.attachmentName).to.eq("specs.pdf");
      expect(payload.attachmentBase64).to.be.a("string").and.not.be.empty;
      expect(payload.attachmentMimeType).to.contain("pdf");
    });
  });
});
