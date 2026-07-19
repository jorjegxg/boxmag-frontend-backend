/**
 * E2E tests – Persistența coșului & badge-ul din header
 *
 * Acoperă:
 * - Badge-ul din header (nr. de linii distincte) și subtotalul persistă la reload
 * - Badge-ul numără liniile distincte, nu cantitatea totală
 * - Ștergerea ultimului articol pe checkout aduce badge-ul din header la zero
 * - Undo readaugă articolul șters
 * - Iconița coșului din header duce la /checkout
 *
 * Notă: comanda `cy.seedCart()` din support/commands.ts scrie în localStorage
 * ÎNAINTE de cy.visit, pe pagina goală (about:blank) — localStorage-ul nu se
 * transferă pe originea aplicației, deci comanda e ineficientă (de-aia nu era
 * folosită în niciun alt spec). Aici seedăm coșul prin onBeforeLoad, ca în
 * checkout-payment-result.cy.ts.
 */

import { CART_STORAGE_KEY } from "../support/commands";

function cartPayload(items: Array<{ itemNo: string; name: string; unitPrice: number; quantity: number }>) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return JSON.stringify({
    state: { items, newCartItems: totalItems, subtotal, totalItems },
    version: 0,
  });
}

const seedCartOnVisit = (
  items: Array<{ itemNo: string; name: string; unitPrice: number; quantity: number }>,
) => ({
  onBeforeLoad(win: Window) {
    win.localStorage.setItem("boxmag.language", "en");
    win.localStorage.setItem(CART_STORAGE_KEY, cartPayload(items));
  },
});

describe("Persistența coșului & badge-ul din header", () => {
  it("reload pe /shop păstrează badge-ul și subtotalul din header", () => {
    cy.intercept("GET", "**/api/box-types", { statusCode: 200, body: { ok: true, data: [] } });

    cy.visit(
      "/shop",
      seedCartOnVisit([
        { itemNo: "BOX-001", name: "Custom Box 300x200", unitPrice: 12.5, quantity: 100 },
      ]),
    );

    cy.get('a[href="/checkout"]').within(() => {
      cy.contains("1").should("be.visible");
    });
    cy.contains("€ 1250.00").should("be.visible");

    cy.reload();
    cy.get('a[href="/checkout"]').within(() => {
      cy.contains("1").should("be.visible");
    });
    cy.contains("€ 1250.00").should("be.visible");
  });

  it("badge-ul numără liniile distincte din coș, nu cantitatea totală", () => {
    cy.intercept("GET", "**/api/box-types", { statusCode: 200, body: { ok: true, data: [] } });

    cy.visit(
      "/shop",
      seedCartOnVisit([
        { itemNo: "BOX-001", name: "Custom Box 300x200", unitPrice: 12.5, quantity: 100 },
        { itemNo: "BOX-002", name: "Custom Box 400x300", unitPrice: 10, quantity: 300 },
      ]),
    );

    // 2 linii distincte în coș, deși cantitatea totală e 400
    cy.get('a[href="/checkout"]').within(() => {
      cy.contains("2").should("be.visible");
      cy.contains("400").should("not.exist");
    });
  });

  it("ștergerea ultimului articol pe checkout aduce badge-ul din header la zero", () => {
    cy.mockCheckoutApis();
    cy.visit(
      "/checkout",
      seedCartOnVisit([
        { itemNo: "BOX-001", name: "Custom Box 300x200", unitPrice: 12.5, quantity: 100 },
      ]),
    );
    cy.wait("@getShippingMethods");

    cy.get('a[href="/checkout"]').within(() => {
      cy.contains("1").should("be.visible");
    });

    cy.contains("button", "Remove product").click();

    cy.contains(/was removed/).should("be.visible");
    cy.get('a[href="/checkout"]').within(() => {
      cy.contains("0").should("be.visible");
    });
  });

  it("Undo readaugă articolul șters pe checkout", () => {
    cy.mockCheckoutApis();
    cy.visit(
      "/checkout",
      seedCartOnVisit([
        { itemNo: "BOX-001", name: "Custom Box 300x200", unitPrice: 12.5, quantity: 100 },
      ]),
    );
    cy.wait("@getShippingMethods");

    cy.contains("button", "Remove product").click();
    cy.contains(/was removed/).should("be.visible");

    cy.contains("button", "Undo").click();
    cy.contains("BOX-001").should("be.visible");
    cy.get('a[href="/checkout"]').within(() => {
      cy.contains("1").should("be.visible");
    });
  });

  it("iconița coșului din header duce la /checkout", () => {
    cy.intercept("GET", "**/api/box-types", { statusCode: 200, body: { ok: true, data: [] } });
    cy.mockCheckoutApis();
    cy.visit("/shop", seedCartOnVisit([]));

    cy.get('a[href="/checkout"]').first().click();
    cy.location("pathname").should("eq", "/checkout");
  });
});
