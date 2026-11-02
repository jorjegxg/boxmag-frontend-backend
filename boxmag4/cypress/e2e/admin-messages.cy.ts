/**
 * E2E — admin contact inbox (INV-ADMIN-MESSAGES)
 *
 * Coverage:
 * - list with status badges, server-side search/status filters
 * - open detail → reply with chosen sender → status "Răspuns trimis"
 * - reply error is shown
 */

const messages = [
  {
    id: 7,
    customerName: "Ana Pop",
    companyName: "Ana SRL",
    email: "ana@example.com",
    phone: "0700000000",
    country: "RO",
    message: "Aș dori o ofertă pentru 500 cutii.",
    status: "new",
    repliedAt: null,
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: 6,
    customerName: "Max Muster",
    companyName: "",
    email: "max@example.de",
    phone: "",
    country: "DE",
    message: "Lieferzeit?",
    status: "replied",
    repliedAt: "2026-09-30T12:00:00.000Z",
    createdAt: "2026-09-30T09:00:00.000Z",
  },
];

const detail = {
  ...messages[0],
  vatNumber: "RO123",
  attachmentNames: "",
  replyMessage: null,
  repliedFrom: null,
  status: "read",
};

const senders = [
  { key: "info", email: "info@boxmag.eu", label: "Info" },
  { key: "b2b", email: "b2b@boxmag.eu", label: "B2B" },
];

describe("Admin – mesaje contact", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("listează mesajele și trimite filtrele către server", () => {
    cy.intercept({ method: "GET", pathname: "/api/contact" }, (req) => {
      req.reply({
        statusCode: 200,
        body: { ok: true, data: messages, meta: { total: 2, page: 1, pageSize: 10 } },
      });
    }).as("getMessages");

    cy.visit("/admin/messages");
    cy.wait("@getMessages").its("request.url").should("include", "page=1");
    cy.contains("tr", "Ana Pop").within(() => {
      cy.contains("Nou").should("exist");
    });
    cy.contains("tr", "Max Muster").within(() => {
      cy.contains("Răspuns trimis").should("exist");
    });
    cy.contains("din 2 mesaje").should("exist");

    // Spy-only aliases: dev StrictMode may repeat the unfiltered request.
    cy.intercept({ method: "GET", pathname: "/api/contact", query: { status: "new" } }).as(
      "filteredByStatus",
    );
    cy.intercept({ method: "GET", pathname: "/api/contact", query: { q: "cutii" } }).as(
      "filteredBySearch",
    );

    cy.waitForHydration();
    cy.get("#messages-status-filter").select("Nou");
    cy.wait("@filteredByStatus");

    cy.get("#messages-search").type("cutii");
    cy.wait("@filteredBySearch").its("request.url").should("include", "status=new");
  });

  it("deschide detaliul și trimite un răspuns", () => {
    cy.intercept({ method: "GET", pathname: "/api/contact" }, {
      statusCode: 200,
      body: { ok: true, data: messages },
    }).as("getMessages");
    cy.intercept("GET", "**/api/contact/reply-senders", {
      statusCode: 200,
      body: { ok: true, data: senders, defaultKey: "info" },
    }).as("getSenders");
    cy.intercept("GET", "**/api/contact/7", {
      statusCode: 200,
      body: { ok: true, data: detail },
    }).as("getMessage");
    cy.intercept("POST", "**/api/contact/7/reply", {
      statusCode: 200,
      body: {
        ok: true,
        data: { to: "ana@example.com", repliedFrom: "b2b@boxmag.eu", repliedAt: "2026-10-02T08:00:00.000Z" },
      },
    }).as("postReply");

    cy.visit("/admin/messages");
    cy.wait("@getMessages");
    cy.contains("tr", "Ana Pop").click();
    cy.location("pathname").should("eq", "/admin/messages/7");
    cy.wait(["@getMessage", "@getSenders"]);
    cy.contains("Aș dori o ofertă pentru 500 cutii.").should("exist");

    cy.get("#reply-sender").select("b2b");
    cy.get("#reply-message").type("Bună ziua, revenim cu oferta azi.");
    cy.contains("button", "Trimite răspuns").click();

    cy.wait("@postReply").its("request.body").should("deep.equal", {
      fromKey: "b2b",
      message: "Bună ziua, revenim cu oferta azi.",
    });
    cy.contains("Răspuns trimis către ana@example.com de la b2b@boxmag.eu").should("exist");
    cy.contains("button", "Retrimite răspuns").should("exist");
  });

  it("afișează eroarea când SMTP nu e configurat (503)", () => {
    cy.intercept("GET", "**/api/contact/reply-senders", {
      statusCode: 200,
      body: { ok: true, data: senders, defaultKey: "info" },
    });
    cy.intercept("GET", "**/api/contact/7", {
      statusCode: 200,
      body: { ok: true, data: detail },
    }).as("getMessage");
    cy.intercept("POST", "**/api/contact/7/reply", {
      statusCode: 503,
      body: { ok: false, message: "Email sending is not configured." },
    }).as("postReplyFail");

    cy.visit("/admin/messages/7");
    cy.wait("@getMessage");
    cy.get("#reply-message").type("Test");
    cy.contains("button", "Trimite răspuns").click();
    cy.wait("@postReplyFail");
    cy.contains("Email sending is not configured.").should("exist");
  });
});
