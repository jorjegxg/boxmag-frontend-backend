/**
 * E2E – flux complet B2B: /business → /order-summary → /business/order-success
 * VAT: RO2816464 (conform cerinței)
 */

const VAT_NUMBER = "RO2816464";
const COMPANY_NAME = "Boxmag Demo SRL";
const GUEST_EMAIL = "cypress.b2b@example.com";
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
    .type("Cypress B2B full flow test.");
  setTermsAccepted(true);
};

const setupGuestSession = () => {
  cy.window().then((win) => {
    win.localStorage.removeItem("boxmag.auth.loggedIn");
    win.localStorage.removeItem("boxmag.auth.email");
    win.sessionStorage.removeItem(STORAGE_KEY);
  });
};

describe("B2B full order flow – guest with VAT RO2816464", () => {
  beforeEach(() => {
    setupGuestSession();

    cy.intercept("GET", "**/api/box-types", {
      statusCode: 200,
      body: { ok: true, data: mockBoxTypes },
    }).as("getBoxTypes");

    cy.intercept("GET", "/api/vat-lookup*", (req) => {
      expect(req.url).to.include(encodeURIComponent(VAT_NUMBER));
      req.reply({
        statusCode: 200,
        body: { ok: true, companyName: COMPANY_NAME },
      });
    }).as("vatLookup");

    cy.intercept("POST", "**/api/orders", {
      statusCode: 201,
      body: { ok: true, data: { id: 128 } },
    }).as("createOrder");
  });

  it("trimite comanda B2B și afișează promptul de creare cont", () => {
    cy.visit("/business");
    cy.wait("@getBoxTypes");

    fillBusinessStep();
    cy.contains("button", "NEXT").click();

    cy.location("pathname").should("eq", "/order-summary");
    cy.contains("Order Summary").should("exist");

    cy.get("#os-firstName").clear().type("Ion");
    cy.get("#os-surname").clear().type("Popescu");
    cy.get("#os-vatNumber").clear().type(VAT_NUMBER);
    cy.wait("@vatLookup");
    cy.get("#os-companyName").should("have.value", COMPANY_NAME);
    cy.get("#os-email").clear().type(GUEST_EMAIL);
    cy.get("#os-phone").clear().type("+40799111222");
    cy.get("#os-address").clear().type("Str. Test 10");
    cy.get("#os-postcode").clear().type("010101");
    cy.get("#os-city").clear().type("Bucuresti");
    cy.get("#os-country").select("RO");

    cy.contains("button", "NEXT").click();
    cy.wait("@createOrder").its("request.body").should((body) => {
      expect(body.vatNumber).to.eq(VAT_NUMBER);
      expect(body.companyName).to.eq(COMPANY_NAME);
      expect(body.email).to.eq(GUEST_EMAIL);
    });

    cy.location("pathname").should("eq", "/business/order-success");
    cy.contains("ORD-0128").should("exist");
    cy.contains(GUEST_EMAIL).should("exist");
    cy.contains("Create a free account").should("exist");
    cy.contains("No, thanks").should("exist");

    cy.contains("a", "Create a free account")
      .should("have.attr", "href")
      .and("include", "email=cypress.b2b%40example.com")
      .and("include", "vatNumber=RO2816464")
      .and("include", "from=b2b-order");
  });
});

describe("B2B order success page", () => {
  const guestPayload = {
    orderId: 42,
    orderNumber: "ORD-0042",
    email: "guest@example.com",
    firstName: "Ion",
    surname: "Popescu",
    companyName: COMPANY_NAME,
    vatNumber: VAT_NUMBER,
    phone: "+40700000000",
    isGuest: true,
  };

  const loggedInPayload = {
    ...guestPayload,
    isGuest: false,
  };

  it("redirects to /business when session payload is missing", () => {
    cy.visit("/business/order-success");
    cy.location("pathname").should("eq", "/business");
  });

  it("shows create-account prompt for guest orders", () => {
    cy.visit("/business/order-success", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(guestPayload));
      },
    });

    cy.contains("ORD-0042").should("exist");
    cy.contains("guest@example.com").should("exist");
    cy.contains("Create a free account").should("exist");
    cy.contains("No, thanks").should("exist");
    cy.contains("Already have an account?").should("exist");

    cy.contains("a", "Create a free account")
      .should("have.attr", "href")
      .and("include", "/registration?")
      .and("include", "email=guest%40example.com")
      .and("include", "from=b2b-order");
  });

  it("shows account links for logged-in users without create-account prompt", () => {
    cy.visit("/business/order-success", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInPayload));
      },
    });

    cy.contains("View my orders").should("exist");
    cy.contains("Continue browsing").should("exist");
    cy.contains("Create a free account").should("not.exist");
  });

  it("clears session storage when guest skips account creation", () => {
    cy.visit("/business/order-success", {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(guestPayload));
      },
    });

    cy.contains("button", "No, thanks").click();
    cy.location("pathname").should("eq", "/");
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(STORAGE_KEY)).to.be.null;
    });
  });
});
