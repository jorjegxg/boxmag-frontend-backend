/**
 * E2E tests – pagina / (Home)
 *
 * Scenarii acoperite:
 *  1. Hero configurator: titlu, 3 selectoare dimensiuni (default 400), CTA
 *  2. Schimbare dimensiuni actualizează href-ul CTA
 *  3. Click CTA → /business?length=&width=&height=
 *  4. Secțiuni: hero, features, testimonials, services
 *  5. CTA-uri către /shop, /business, /contact
 *  6. Newsletter: submit valid cu mock API
 */

const visitHome = () => {
  cy.visit("/", {
    onBeforeLoad(win) {
      win.localStorage.setItem("boxmag.language", "en");
    },
  });
};

const heroSelects = () =>
  cy
    .contains("h1", /E-commerce shipping|Cutii de livrare|E-Commerce Versandkartons/i)
    .closest("section")
    .find("select");

describe("Home page – hero configurator", () => {
  beforeEach(() => {
    visitHome();
  });

  it("afișează titlul, selectoarele de dimensiuni și CTA-ul", () => {
    cy.contains("h1", /E-commerce shipping/i).should("be.visible");
    cy.contains("Length").should("be.visible");
    cy.contains("Width").should("be.visible");
    cy.contains("Height").should("be.visible");

    heroSelects().should("have.length", 3);
    heroSelects().eq(0).should("have.value", "400");
    heroSelects().eq(1).should("have.value", "400");
    heroSelects().eq(2).should("have.value", "400");

    cy.contains("a", /GET STARTED/i)
      .should("be.visible")
      .and("have.attr", "href")
      .and("include", "/business")
      .and("include", "length=400")
      .and("include", "width=400")
      .and("include", "height=400");
  });

  it("actualizează query params când se schimbă dimensiunile", () => {
    heroSelects().eq(0).select("600");
    heroSelects().eq(1).select("500");
    heroSelects().eq(2).select("300");

    cy.contains("a", /GET STARTED/i)
      .should("have.attr", "href")
      .and("include", "length=600")
      .and("include", "width=500")
      .and("include", "height=300");
  });

  it("navighează spre /business cu dimensiunile selectate", () => {
    cy.get('a[href^="/business?"]')
      .first()
      .should("have.attr", "href")
      .and("include", "length=400")
      .and("include", "width=400")
      .and("include", "height=400");

    cy.get('a[href^="/business?"]').first().click();
    cy.url().should("include", "/business?length=400&width=400&height=400");
  });

  it("navighează cu dimensiuni personalizate", () => {
    heroSelects().eq(0).select("800");
    heroSelects().eq(1).select("200");
    heroSelects().eq(2).select("1000");

    cy.contains("a", /GET STARTED/i).click();
    cy.url()
      .should("include", "/business?")
      .and("include", "length=800")
      .and("include", "width=200")
      .and("include", "height=1000");
  });
});

describe("Home page – secțiuni", () => {
  beforeEach(() => {
    visitHome();
  });

  it("randează hero, features, testimonials și services", () => {
    cy.contains("h1", /E-commerce shipping/i).should("be.visible");
    cy.contains(/SHIPPING IN/i).should("exist");
    cy.contains(/WE DELIVER IN/i).should("exist");
    cy.contains(/ECO FRIENDLY/i).should("exist");
    cy.contains(/Perfect boxes/i).should("exist");
    cy.contains(/SHOPPING/i).should("exist");
    cy.contains(/PRINTED BOXES/i).should("exist");
    cy.contains(/CUSTOM BOX/i).should("exist");
  });
});

describe("Home page – CTA links", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/box-types", {
      statusCode: 200,
      body: {
        ok: true,
        data: [
          {
            id: 1,
            title: "Standard Boxes",
            key: "standard",
            isActive: true,
            images: [],
          },
        ],
      },
    }).as("boxTypes");

    visitHome();
  });

  it("leagă CTA-urile la /shop, /business și /contact", () => {
    cy.get('button[aria-label="Open shop menu"]').click();
    cy.wait("@boxTypes");
    cy.get('a[href*="/shop"]').should("have.length.at.least", 1);

    cy.get('a[href="/business"]').should("exist");
    cy.get('a[href^="/business?"]').should("exist");
    cy.get('a[href="/contact"]').should("exist");

    cy.contains("a", /ENTER/i).should("have.attr", "href", "/business");
    cy.contains("a", /GET IN TOUCH/i).should("have.attr", "href", "/contact");
  });
});

describe("Home page – newsletter", () => {
  beforeEach(() => {
    visitHome();
  });

  it("trimite subscribe cu email valid (mock API)", () => {
    cy.intercept("POST", "**/api/newsletter/subscribe", {
      statusCode: 200,
      body: { ok: true, message: "Subscribed" },
    }).as("newsletterSubscribe");

    cy.contains("h2", /Subscribe to/i).scrollIntoView();
    cy.get('input[type="email"]')
      .filter(":visible")
      .last()
      .clear()
      .type("newsletter-test@example.com");
    cy.get('input[type="checkbox"]').filter(":visible").last().check({ force: true });
    cy.contains("button", /SUBSCRIBE/i).click();

    cy.wait("@newsletterSubscribe").its("request.body").should((body) => {
      expect(body).to.include({
        email: "newsletter-test@example.com",
        consent: true,
        source: "footer-newsletter",
      });
    });

    cy.contains(/Subscription successful/i).should("be.visible");
  });

  it("afișează eroare dacă lipsește consimțământul", () => {
    cy.contains("h2", /Subscribe to/i).scrollIntoView();
    cy.get('input[type="email"]')
      .filter(":visible")
      .last()
      .clear()
      .type("newsletter-test@example.com");
    cy.contains("button", /SUBSCRIBE/i).click();
    cy.contains(/accept consent/i).should("be.visible");
  });
});
