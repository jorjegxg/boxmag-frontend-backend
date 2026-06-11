/**
 * E2E tests – pagina /contact
 *
 * Scenarii acoperite:
 *  1. Pagina se încarcă corect (titlu, formular, info magazin)
 *  2. Submit fără câmpuri → notificare de eroare
 *  3. Submit cu VAT invalid → notificare de eroare VAT
 *  4. Submit fără acceptarea termenilor → notificare de eroare termeni
 *  5. Formular completat corect → request POST /api/contact interceptat
 *  6. API răspunde cu eroare → notificarea de eroare este afișată
 *  7. API răspunde cu succes → notificarea de succes + câmpuri resetate
 */

const BASE = "/contact";

const mockVatLookup = (companyName = "Test SRL") => {
  cy.intercept("GET", "/api/vat-lookup*", {
    statusCode: 200,
    body: { ok: true, companyName },
  }).as("vatLookup");
};

const fillForm = (overrides: Partial<{
  firstName: string;
  surname: string;
  companyName: string;
  vatNumber: string;
  email: string;
  phone: string;
  country: string;
  message: string;
}> = {}) => {
  const data = {
    firstName:   "John",
    surname:     "Doe",
    companyName: "Test SRL",
    vatNumber:   "RO12345678",
    email:       "test@example.com",
    phone:       "+40799111222",
    country:     "RO",
    message:     "Test message from Cypress.",
    ...overrides,
  };

  const hasValidVatFormat = /^[A-Za-z]{2}[A-Za-z0-9]{2,12}$/.test(data.vatNumber);
  if (hasValidVatFormat) {
    mockVatLookup(data.companyName);
  }

  cy.get("#firstName").clear().type(data.firstName);
  cy.get("#surname").clear().type(data.surname);
  cy.get("#vatNumber").clear().type(data.vatNumber);
  if (hasValidVatFormat) {
    cy.wait("@vatLookup");
    cy.get("#companyName").should("have.value", data.companyName);
  }
  cy.get("#email").clear().type(data.email);
  cy.get("#phone").clear().type(data.phone);
  cy.get("#country").select(data.country);
  cy.get("#message").clear().type(data.message);
};

// ---------------------------------------------------------------------------

describe("Contact page – încărcare", () => {
  beforeEach(() => {
    cy.visit(BASE);
  });

  it("afișează formularul de contact", () => {
    cy.get("form").should("exist");
    cy.get("#firstName").should("exist");
    cy.get("#surname").should("exist");
    cy.get("#companyName").should("exist");
    cy.get("#vatNumber").should("exist");
    cy.get("#email").should("exist");
    cy.get("#phone").should("exist");
    cy.get("#country").should("exist");
    cy.get("#message").should("exist");
  });

  it("afișează butonul de submit", () => {
    cy.get('button[type="submit"]').should("exist").and("not.be.disabled");
  });

  it("afișează secțiunea de informații magazin (adresă, telefon, mail)", () => {
    cy.contains("Stefan cel Mare 131").should("exist");
    cy.contains("+40 799 553 345").should("exist");
    cy.contains(Cypress.env("infoEmail") as string).should("exist");
  });

  it("breadcrumb-ul conține linkul Home", () => {
    cy.get('a[href="/"]').first().should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Contact page – validare câmpuri obligatorii", () => {
  beforeEach(() => {
    cy.visit(BASE);
  });

  it("afișează eroare la submit fără câmpuri completate", () => {
    cy.intercept("GET", "/api/vat-lookup*", {
      statusCode: 404,
      body: { ok: false, message: "VAT number not found or invalid" },
    });

    // Ștergem orice pre-fill din dev mode
    cy.get("#firstName").clear();
    cy.get("#surname").clear();
    cy.get("#vatNumber").clear();
    cy.get("#email").clear();
    cy.get("#phone").clear();
    cy.get("#message").clear();

    // Dezactivăm validarea nativă HTML5 (required) ca React să ruleze handleSubmit
    cy.get("form").invoke("attr", "novalidate", "true");
    cy.get('button[type="submit"]').click();

    // Notificarea de eroare trebuie să apară
    cy.contains("Please complete the following fields").should("exist");
  });

  it("focus-ul sare pe primul câmp lipsă", () => {
    cy.intercept("GET", "/api/vat-lookup*", {
      statusCode: 404,
      body: { ok: false, message: "VAT number not found or invalid" },
    });

    cy.get("#firstName").clear();
    cy.get("#surname").clear();
    cy.get("#vatNumber").clear();
    cy.get("#email").clear();
    cy.get("#phone").clear();
    cy.get("#message").clear();

    cy.get('button[type="submit"]').click();

    cy.focused().should("have.attr", "id", "firstName");
  });
});

// ---------------------------------------------------------------------------

describe("Contact page – validare VAT", () => {
  beforeEach(() => {
    cy.visit(BASE);
  });

  it("afișează eroare la VAT invalid", () => {
    fillForm({ vatNumber: "INVALID000", companyName: "" });
    // acceptăm termenii
    cy.get('input[type="checkbox"]').check({ force: true });

    cy.get('button[type="submit"]').click();

    cy.contains("Invalid VAT number").should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Contact page – validare termeni", () => {
  beforeEach(() => {
    cy.visit(BASE);
  });

  it("afișează eroare dacă termenii nu sunt acceptați", () => {
    fillForm();
    // Ne asigurăm că checkbox-ul este debifat
    cy.get('input[type="checkbox"]').uncheck({ force: true });

    cy.get('button[type="submit"]').click();

    cy.contains("Please accept terms").should("exist");
  });
});

// ---------------------------------------------------------------------------

describe("Contact page – submit corect (mock API)", () => {
  it("trimite POST /api/contact cu datele corecte", () => {
    cy.intercept("POST", "/api/contact", {
      statusCode: 200,
      body: { message: "Message sent successfully." },
    }).as("contactPost");

    cy.visit(BASE);

    fillForm();
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('button[type="submit"]').click();

    cy.wait("@contactPost").then((interception) => {
      // Verificăm că body-ul trimis conține câmpurile corecte
      const body = interception.request.body as string;
      expect(body).to.include("firstName");
      expect(body).to.include("email");
      expect(body).to.include("message");
    });
  });

  it("afișează notificare de succes după trimitere reușită", () => {
    cy.intercept("POST", "/api/contact", {
      statusCode: 200,
      body: { message: "Message sent successfully." },
    }).as("contactPost");

    cy.visit(BASE);

    fillForm();
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('button[type="submit"]').click();

    cy.wait("@contactPost");
    cy.contains("Message sent successfully.").should("exist");
  });

  it("resetează câmpurile după trimitere reușită", () => {
    cy.intercept("POST", "/api/contact", {
      statusCode: 200,
      body: { message: "Message sent successfully." },
    }).as("contactPost");

    cy.visit(BASE);

    fillForm();
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('button[type="submit"]').click();

    cy.wait("@contactPost");

    cy.get("#firstName").should("have.value", "");
    cy.get("#surname").should("have.value", "");
    cy.get("#email").should("have.value", "");
    cy.get("#message").should("have.value", "");
  });
});

// ---------------------------------------------------------------------------

describe("Contact page – eroare API", () => {
  it("afișează notificare de eroare când API-ul întoarce 500", () => {
    cy.intercept("POST", "/api/contact", {
      statusCode: 500,
      body: { message: "Server error. Please try again later." },
    }).as("contactError");

    cy.visit(BASE);

    fillForm();
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('button[type="submit"]').click();

    cy.wait("@contactError");
    cy.contains("Server error").should("exist");
  });

  it("butonul este dezactivat în timp ce se trimite", () => {
    // Simulăm un răspuns lent
    cy.intercept("POST", "/api/contact", (req) => {
      req.reply((res) => {
        res.setDelay(1500);
        res.send({ statusCode: 200, body: { message: "OK" } });
      });
    }).as("slowPost");

    cy.visit(BASE);

    fillForm();
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('button[type="submit"]').click();

    cy.get('button[type="submit"]').should("be.disabled");
    cy.wait("@slowPost");
    cy.get('button[type="submit"]').should("not.be.disabled");
  });
});

// ---------------------------------------------------------------------------

describe("Contact page – linkuri navigație", () => {
  beforeEach(() => {
    cy.visit(BASE);
  });

  it("linkul Terms duce la /regulations", () => {
    cy.get('a[href="/regulations"]').should("exist");
  });

  it("linkul Privacy duce la /privacy-policy", () => {
    cy.get('a[href="/privacy-policy"]').should("exist");
  });
});
