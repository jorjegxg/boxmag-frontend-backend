/**
 * E2E tests – /corrugated-envelopes (product line table, boxTypeId=9)
 *
 * Acoperă:
 *  1. Tabelul se încarcă din API (mock, boxTypeId=9)
 *  2. Add to cart scrie în localStorage (boxmag.cart)
 *  3. Articolul adăugat apare corect pe /checkout
 */

type MockProductRow = {
  itemNo: string;
  productName: string;
  imageUrl?: string;
  internalDimensionsMM: { l: number; w: number; h: number };
  qualityCardboard: string;
  palletDimensionsCM: { l: number; w: number; h: number };
  weightPieceGr: number;
  weightPalletKg: number;
  amountQtyInPcs: number;
  palletPcs: number;
  prices: Array<{ id: number; name: string; withoutTax: number; withTax: number }>;
};

const mockEnvelopeProduct: MockProductRow = {
  itemNo: "MEV-001",
  productName: "M-EV Envelope 250x180",
  imageUrl: "/b2b/boxes/envelope.png",
  internalDimensionsMM: { l: 250, w: 180, h: 50 },
  qualityCardboard: "E-flute",
  palletDimensionsCM: { l: 100, w: 70, h: 120 },
  weightPieceGr: 90,
  weightPalletKg: 60,
  amountQtyInPcs: 100,
  palletPcs: 9000,
  prices: [
    { id: 1, name: "300", withoutTax: 0.3, withTax: 0.363 },
    { id: 2, name: "500", withoutTax: 0.27, withTax: 0.3267 },
    { id: 3, name: "Pallet", withoutTax: 0.24, withTax: 0.2904 },
  ],
};

const interceptEnvelopeProducts = (products: MockProductRow[] = [mockEnvelopeProduct]) => {
  cy.intercept("GET", "**/api/box-types/9/products", {
    statusCode: 200,
    body: { ok: true, data: products },
  }).as("getEnvelopeProducts");
};

const visitCorrugatedEnvelopes = () => {
  cy.visit("/corrugated-envelopes", {
    onBeforeLoad(win) {
      win.localStorage.setItem("boxmag.language", "en");
      win.localStorage.removeItem("boxmag.cart");
    },
  });
};

const productRow = (itemNo: string) => cy.contains("td", itemNo).closest("tr");

describe("/corrugated-envelopes – product table", () => {
  beforeEach(() => {
    interceptEnvelopeProducts();
    visitCorrugatedEnvelopes();
    cy.wait("@getEnvelopeProducts");
  });

  it("pagina se randează fără erori și tabelul încarcă produsul M-EV", () => {
    cy.contains("h2", /corrugated/i).should("be.visible");
    cy.contains("td", "MEV-001").should("be.visible");
    cy.contains("td", "M-EV Envelope 250x180").should("be.visible");
  });

  it("Add to cart adaugă produsul în localStorage (boxmag.cart)", () => {
    productRow("MEV-001").within(() => {
      cy.contains("button", /Add to cart/i).click();
    });

    cy.contains(/Added 100 pcs to cart/i).should("be.visible");

    cy.window().then((win) => {
      const raw = win.localStorage.getItem("boxmag.cart");
      expect(raw, "boxmag.cart exists").to.be.a("string").and.not.be.empty;
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: Array<{ itemNo: string; quantity: number; unitPrice: number }> };
      };
      const match = parsed.state?.items?.find((i) => i.itemNo === "MEV-001");
      expect(match, "MEV-001 in cart").to.exist;
      expect(match?.quantity).to.eq(100);
      expect(match?.unitPrice).to.eq(0.3);
    });
  });
});

describe("/corrugated-envelopes → /checkout", () => {
  beforeEach(() => {
    interceptEnvelopeProducts();
    cy.mockCheckoutApis();
    visitCorrugatedEnvelopes();
    cy.wait("@getEnvelopeProducts");
  });

  it("produsul adăugat apare pe checkout cu qty și total corecte", () => {
    productRow("MEV-001").within(() => {
      cy.contains("button", /Add to cart/i).click();
    });
    cy.contains(/Added 100 pcs to cart/i).should("be.visible");

    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("Cart is empty.").should("not.exist");
    cy.contains("MEV-001").should("be.visible");
    cy.contains("M-EV Envelope 250x180").should("be.visible");
    // 0.30 x 100 = 30
    cy.contains("€ 30.00").should("be.visible");
  });
});
