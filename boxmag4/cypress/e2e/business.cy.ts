/**
 * E2E tests – pagina /business (configurator B2B)
 *
 * Scenarii acoperite:
 *  1. Încărcare pagină (pași, secțiuni, breadcrumb, contact B2B)
 *  2. Încărcare tipuri cutii din API (mock)
 *  3. Eroare la încărcarea tipurilor de cutii
 *  4. Selectare tip cutie din grid
 *  5. Validare câmpuri obligatorii (notificare + mesaj inline)
 *  6. Query params pentru dimensiuni (length, width, height)
 *  7. Flux complet → navigare către /order-summary cu datele draft
 */

const BASE = "/business";

type MockBoxType = {
  id: number;
  title: string;
  isActive: boolean;
  images: Array<{ url: string; isPrimary: boolean }>;
};

const mockBoxTypes: MockBoxType[] = [
  {
    id: 1,
    title: "Standard Boxes",
    isActive: true,
    images: [{ url: "/b2b/boxes/box.png", isPrimary: true }],
  },
  {
    id: 2,
    title: "Custom Mailers",
    isActive: true,
    images: [{ url: "/b2b/boxes/box.png", isPrimary: true }],
  },
  {
    id: 99,
    title: "Inactive Type",
    isActive: false,
    images: [],
  },
];

const interceptBoxTypes = (options: { boxTypes?: MockBoxType[]; delayMs?: number } = {}) => {
  const boxTypes = options.boxTypes ?? mockBoxTypes;

  if (options.delayMs) {
    cy.intercept("GET", "**/api/box-types", (req) => {
      req.reply((res) => {
        res.setDelay(options.delayMs);
        res.send({ statusCode: 200, body: { ok: true, data: boxTypes } });
      });
    }).as("getBoxTypes");
    return;
  }

  cy.intercept("GET", "**/api/box-types", {
    statusCode: 200,
    body: { ok: true, data: boxTypes },
  }).as("getBoxTypes");
};

const visitBusiness = (path = BASE) => {
  interceptBoxTypes();
  cy.visit(path);
  cy.wait("@getBoxTypes");
};

/** Radix Checkbox – toggle doar dacă starea curentă diferă de cea dorită. */
const setTermsAccepted = (accepted: boolean) => {
  cy.get("#terms-checkbox-basic").then(($el) => {
    const isChecked = $el.attr("aria-checked") === "true";
    if (isChecked !== accepted) {
      cy.wrap($el).click({ force: true });
    }
  });
};

/** Curăță câmpurile pre-completate în mod development. */
const clearFormFields = () => {
  cy.get("#package-length").clear();
  cy.get("#package-width").clear();
  cy.get("#package-height").clear();
  cy.get("#boxes-quantity").clear();
  cy.get('textarea[placeholder*="message"]').clear();
  setTermsAccepted(false);
};

const clickNext = () => {
  cy.contains("button", "NEXT").click();
};

/** Selectează un card produs din secțiune (click pe card, nu doar pe buton). */
const selectProductCard = (sectionId: string, label: string) => {
  cy.get(`#${sectionId}`)
    .contains(label)
    .closest('[role="button"]')
    .click();
};

const fillMinimalValidForm = () => {
  selectProductCard("section-box-type-cards", "Standard Boxes");
  selectProductCard("section-cardboard-type-cards", "B Wave");
  selectProductCard(
    "section-cardboard-color-cards",
    "Brown On Both Side",
  );

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
    .type("Cypress B2B inquiry.");
  setTermsAccepted(true);
};

// ---------------------------------------------------------------------------

describe("Business page – încărcare", () => {
  it("afișează pașii configurării și secțiunile principale", () => {
    visitBusiness();

    cy.contains("STEP 1").should("exist");
    cy.contains("STEP 2").should("exist");
    cy.contains("STEP 3").should("exist");
    cy.contains("Select Box Type").should("exist");
    cy.contains("Select Cardboard Type").should("exist");
    cy.contains("Box Size").should("exist");
    cy.contains("Transport").should("exist");
    cy.contains("Quantity").should("exist");
    cy.contains("Message").should("exist");
  });

  it("afișează breadcrumb-ul cu link Home și B2B", () => {
    visitBusiness();

    cy.get('a[href="/"]').first().should("exist");
    cy.contains("B2B").should("exist");
  });

  it("afișează secțiunea de contact B2B", () => {
    visitBusiness();

    cy.contains("b2b@reko-packaging.ro").should("exist");
    cy.get('a[href="mailto:b2b@reko-packaging.ro"]').should("exist");
    cy.contains("+40 799 553 345").should("exist");
  });

  it("afișează câmpurile pentru dimensiuni și cantitate", () => {
    visitBusiness();

    cy.get("#package-length").should("exist");
    cy.get("#package-width").should("exist");
    cy.get("#package-height").should("exist");
    cy.get("#boxes-quantity").should("exist");
    cy.get("#terms-checkbox-basic").should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Business page – API tipuri cutii", () => {
  it("afișează tipurile active din API", () => {
    visitBusiness();

    cy.contains("Standard Boxes").should("exist");
    cy.contains("Custom Mailers").should("exist");
    cy.contains("Inactive Type").should("not.exist");
  });

  it("afișează eroare când API-ul eșuează", () => {
    cy.intercept("GET", "**/api/box-types", {
      statusCode: 500,
      body: { ok: false, message: "Server unavailable" },
    }).as("getBoxTypesError");

    cy.visit(BASE);
    cy.wait("@getBoxTypesError");

    cy.contains("Failed to load box types").should("exist");
  });

  it("permite selectarea unui tip de cutie", () => {
    visitBusiness();

    selectProductCard("section-box-type-cards", "Custom Mailers");

    cy.contains("Custom Mailers")
      .closest('[role="button"]')
      .contains("button", "CONFIRMED")
      .should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Business page – query params dimensiuni", () => {
  it("pre-completează length, width și height din URL", () => {
    interceptBoxTypes();
    cy.visit(`${BASE}?length=111&width=222&height=333`);
    cy.wait("@getBoxTypes");

    cy.get("#package-length").should("have.value", "111");
    cy.get("#package-width").should("have.value", "222");
    cy.get("#package-height").should("have.value", "333");
  });
});

// ---------------------------------------------------------------------------

describe("Business page – validare", () => {
  beforeEach(() => {
    visitBusiness();
    clearFormFields();
  });

  it("afișează eroare când nu există tip de cutie selectat", () => {
    interceptBoxTypes({ boxTypes: [] });
    cy.visit(BASE);
    cy.wait("@getBoxTypes");
    clearFormFields();

    clickNext();

    cy.get('[role="alert"]').should("contain", "Please select a box type.");
    cy.contains("Please select a box type.").should("exist");
  });

  it("afișează eroare când lungimea lipsește", () => {
    fillMinimalValidForm();
    cy.get("#package-length").clear();

    clickNext();

    cy.get('[role="alert"]').should("contain", "Length is required.");
    cy.contains("Length is required.").should("exist");
  });

  it("afișează eroare când termenii nu sunt acceptați", () => {
    fillMinimalValidForm();
    setTermsAccepted(false);

    clickNext();

    cy.get('[role="alert"]').should(
      "contain",
      "You must accept terms and conditions.",
    );
  });

  it("afișează eroare când mesajul lipsește", () => {
    fillMinimalValidForm();
    cy.get('textarea[placeholder*="message"]').clear();

    clickNext();

    cy.get('[role="alert"]').should("contain", "Message is required.");
  });
});

// ---------------------------------------------------------------------------

describe("Business page – flux către order summary", () => {
  it("navighează la /order-summary cu datele completate", () => {
    visitBusiness();
    clearFormFields();
    fillMinimalValidForm();

    clickNext();

    cy.location("pathname").should("eq", "/order-summary");
    cy.contains("Order Summary").should("exist");
    cy.contains("400 x 300 x 200 mm").should("exist");
    cy.contains("500").should("exist");
    cy.contains("Cypress B2B inquiry.").should("exist");
    cy.contains("Standard Boxes").should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Business page – opțiuni statice", () => {
  beforeEach(() => {
    visitBusiness();
  });

  it("permite selectarea tipului de carton", () => {
    selectProductCard("section-cardboard-type-cards", "C Wave");

    cy.get("#section-cardboard-type-cards")
      .contains("C Wave")
      .closest('[role="button"]')
      .contains("button", "CONFIRMED")
      .should("exist");
  });

  it("permite selectarea opțiunii de print", () => {
    cy.get("#section-box-print-cards")
      .contains("button", "2 Colors")
      .click()
      .should("have.class", "bg-my-yellow");
  });

  it("permite selectarea transportului", () => {
    cy.contains("button", "Carrier")
      .click()
      .should("have.class", "bg-my-yellow");
  });
});
