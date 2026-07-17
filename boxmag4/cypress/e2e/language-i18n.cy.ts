/**
 * E2E – Limbă i18n (EN / RO / DE)
 *
 * Docs: cypress/documentation/language-i18n.md
 *
 * Scenarii:
 *  1. TopBar Selector → RO: footer + checkout strings RO
 *  2. /ro/about → redirect /about + cookie boxmag.language=ro
 *  3. /de/shop → redirect /shop + UI DE
 *  4. Limba persistă după reload (localStorage + cookie)
 */

const LANG_STORAGE = "boxmag.language";

const languageSelect = () =>
  cy.contains("span", /Language|Limba|Sprache/i).parent().find("select");

const visitEn = (path: string) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(LANG_STORAGE, "en");
      win.document.cookie = `${LANG_STORAGE}=en; path=/; max-age=31536000; samesite=lax`;
    },
  });
};

describe("Limbă i18n (EN / RO / DE)", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("switch TopBar la RO — stringuri UI cheie se schimbă (footer, checkout)", () => {
    visitEn("/");

    languageSelect().should("have.value", "EN");
    cy.contains("Store information").should("be.visible");
    cy.contains("Our company").should("be.visible");

    languageSelect().select("RO");

    languageSelect().should("have.value", "RO");
    cy.contains("Limba").should("be.visible");
    cy.contains("Informații magazin").should("be.visible");
    cy.contains("Compania noastră").should("be.visible");

    cy.window().then((win) => {
      expect(win.localStorage.getItem(LANG_STORAGE)).to.eq("ro");
    });
    cy.getCookie(LANG_STORAGE).should("have.property", "value", "ro");

    cy.visitCheckoutLoggedOut();
    cy.contains(/Coș de cumpărături|Sumar comandă/i).should("be.visible");
  });

  it("vizită /ro/about redirecționează la /about și setează cookie boxmag.language", () => {
    cy.visit("/ro/about", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(LANG_STORAGE);
      },
    });

    cy.location("pathname").should("eq", "/about");
    cy.getCookie(LANG_STORAGE).should("have.property", "value", "ro");
    cy.contains(/Despre noi/i).should("be.visible");
    languageSelect().should("have.value", "RO");
  });

  it("vizită /de/shop redirecționează la /shop cu traduceri germane", () => {
    cy.intercept("GET", "**/api/box-types*", {
      statusCode: 200,
      body: { ok: true, data: [] },
    }).as("boxTypes");

    cy.visit("/de/shop", {
      onBeforeLoad(win) {
        win.localStorage.removeItem(LANG_STORAGE);
      },
    });

    cy.location("pathname").should("eq", "/shop");
    cy.getCookie(LANG_STORAGE).should("have.property", "value", "de");
    cy.contains(/Verpackungen für E-Commerce|BoxFix Produkte|Sprache/i).should(
      "be.visible",
    );
    languageSelect().should("have.value", "DE");
  });

  it("limba persistă după reload", () => {
    visitEn("/");

    languageSelect().select("DE");
    languageSelect().should("have.value", "DE");
    cy.contains("Sprache").should("be.visible");
    cy.contains("Shop-Informationen").should("be.visible");

    cy.reload();

    languageSelect().should("have.value", "DE");
    cy.contains("Sprache").should("be.visible");
    cy.contains("Shop-Informationen").should("be.visible");
    cy.window().then((win) => {
      expect(win.localStorage.getItem(LANG_STORAGE)).to.eq("de");
    });
    cy.getCookie(LANG_STORAGE).should("have.property", "value", "de");
  });
});
