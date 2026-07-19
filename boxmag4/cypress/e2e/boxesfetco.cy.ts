/**
 * E2E tests – /boxesfetco (BoxFix product table)
 *
 * Scenarii:
 *  1. Tabelul se încarcă din API (mock)
 *  2. Add to cart scrie în localStorage (boxmag.cart)
 *  3. Cantitatea din rând se resetează după add to cart
 *  4. Articolele din tabel apar corect pe /checkout
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
  prices: Array<{
    id: number;
    name: string;
    withoutTax: number;
    withTax: number;
  }>;
};

const mockBoxFixProduct: MockProductRow = {
  itemNo: "BFX-001",
  productName: "BoxFix 300x200x150",
  imageUrl: "/b2b/boxes/box.png",
  internalDimensionsMM: { l: 300, w: 200, h: 150 },
  qualityCardboard: "BC",
  palletDimensionsCM: { l: 120, w: 80, h: 150 },
  weightPieceGr: 250,
  weightPalletKg: 120,
  amountQtyInPcs: 100,
  palletPcs: 9000,
  prices: [
    { id: 1, name: "300", withoutTax: 0.45, withTax: 0.5445 },
    { id: 2, name: "500", withoutTax: 0.4, withTax: 0.484 },
    { id: 3, name: "Pallet", withoutTax: 0.35, withTax: 0.4235 },
  ],
};

const interceptBoxFixProducts = (products: MockProductRow[] = [mockBoxFixProduct]) => {
  cy.intercept("GET", "**/api/box-types/1/products", {
    statusCode: 200,
    body: { ok: true, data: products },
  }).as("getBoxFixProducts");
};

const visitBoxesfetco = () => {
  cy.visit("/boxesfetco", {
    onBeforeLoad(win) {
      win.localStorage.setItem("boxmag.language", "en");
      win.localStorage.removeItem("boxmag.cart");
    },
  });
};

const productRow = (itemNo: string) =>
  cy.contains("td", itemNo).closest("tr");

describe("/boxesfetco – product table", () => {
  beforeEach(() => {
    interceptBoxFixProducts();
    visitBoxesfetco();
    cy.wait("@getBoxFixProducts");
  });

  it("încarcă tabelul cu produsul BoxFix", () => {
    cy.contains("h1", /products|produse|produkte/i).should("be.visible");
    cy.contains("td", "BFX-001").should("be.visible");
    cy.contains("td", "BoxFix 300x200x150").should("be.visible");
    productRow("BFX-001").within(() => {
      cy.contains("span", "100").should("be.visible");
      cy.contains("button", /Add to cart/i).should("be.enabled");
    });
  });

  it("Add to cart adaugă produsul în localStorage (boxmag.cart)", () => {
    productRow("BFX-001").within(() => {
      cy.contains("button", /Add to cart/i).click();
    });

    cy.contains(/Added 100 pcs to cart/i).should("be.visible");

    cy.window().then((win) => {
      const raw = win.localStorage.getItem("boxmag.cart");
      expect(raw, "boxmag.cart exists").to.be.a("string").and.not.be.empty;
      const parsed = JSON.parse(raw as string) as {
        state?: {
          items?: Array<{
            itemNo: string;
            name: string;
            quantity: number;
            unitPrice: number;
          }>;
        };
      };
      const items = parsed.state?.items ?? [];
      const match = items.find((i) => i.itemNo === "BFX-001");
      expect(match, "BFX-001 in cart").to.exist;
      expect(match?.name).to.eq("BoxFix 300x200x150");
      expect(match?.quantity).to.eq(100);
      expect(match?.unitPrice).to.eq(0.45);
    });
  });

  it("resetează cantitatea la default după Add to cart", () => {
    productRow("BFX-001").within(() => {
      cy.get('button[aria-label="Increase quantity"]').click();
      cy.get('button[aria-label="Increase quantity"]').click();
      cy.contains("span", "140").should("be.visible");

      cy.contains("button", /Add to cart/i).click();
    });

    cy.contains(/Added 140 pcs to cart/i).should("be.visible");

    cy.window().then((win) => {
      const raw = win.localStorage.getItem("boxmag.cart");
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: Array<{ itemNo: string; quantity: number }> };
      };
      const match = parsed.state?.items?.find((i) => i.itemNo === "BFX-001");
      expect(match?.quantity).to.eq(140);
    });

    // qty UI resets to defaultAmountQtyInPcs (100)
    productRow("BFX-001").within(() => {
      cy.contains("span", "100").should("be.visible");
      cy.contains("span", "140").should("not.exist");
      cy.contains("button", /Add to cart/i).should("be.enabled");
    });
  });

  it("Add to cart cu pallet adaugă qty mărită, apoi resetează la 100", () => {
    productRow("BFX-001").within(() => {
      cy.get('button[aria-label="Add one pallet"]').click();
      // 100 + 9000 pallet
      cy.contains("span", "9100").should("be.visible");
      cy.contains("button", /Add to cart/i).click();
    });

    cy.contains(/Added 9100 pcs to cart/i).should("be.visible");

    cy.window().then((win) => {
      const raw = win.localStorage.getItem("boxmag.cart");
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: Array<{ itemNo: string; quantity: number }> };
      };
      const match = parsed.state?.items?.find((i) => i.itemNo === "BFX-001");
      expect(match?.quantity).to.eq(9100);
    });

    productRow("BFX-001").within(() => {
      cy.contains("span", "100").should("be.visible");
      cy.contains("span", "9100").should("not.exist");
    });
  });
});

describe("/boxesfetco → /checkout", () => {
  beforeEach(() => {
    interceptBoxFixProducts();
    cy.mockCheckoutApis();
    visitBoxesfetco();
    cy.wait("@getBoxFixProducts");
  });

  it("produsul adăugat apare pe checkout cu qty și total corecte", () => {
    productRow("BFX-001").within(() => {
      cy.contains("button", /Add to cart/i).click();
    });
    cy.contains(/Added 100 pcs to cart/i).should("be.visible");

    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("Cart is empty.").should("not.exist");
    cy.contains("BFX-001").should("be.visible");
    cy.contains("BoxFix 300x200x150").should("be.visible");
    cy.contains("100").should("exist");
    // 0.45 × 100 = 45
    cy.contains("€ 45.00").should("exist");
  });

  it("qty mărită pe tabel ajunge corect pe checkout", () => {
    productRow("BFX-001").within(() => {
      cy.get('button[aria-label="Increase quantity"]').click();
      cy.get('button[aria-label="Increase quantity"]').click();
      cy.contains("span", "140").should("be.visible");
      cy.contains("button", /Add to cart/i).click();
    });
    cy.contains(/Added 140 pcs to cart/i).should("be.visible");

    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("BFX-001").should("be.visible");
    cy.contains("BoxFix 300x200x150").should("be.visible");
    cy.contains("BFX-001")
      .closest(".rounded-lg.border")
      .find('input[type="number"]')
      .should("have.value", "140");
    // 0.45 × 140 = 63
    cy.contains("€ 63.00").should("exist");
  });

  it("pallet qty apare pe checkout, apoi coșul nu e gol", () => {
    productRow("BFX-001").within(() => {
      cy.get('button[aria-label="Add one pallet"]').click();
      cy.contains("span", "9100").should("be.visible");
      cy.contains("button", /Add to cart/i).click();
    });
    cy.contains(/Added 9100 pcs to cart/i).should("be.visible");

    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("Cart is empty.").should("not.exist");
    cy.contains("BFX-001").should("be.visible");
    cy.contains("BFX-001")
      .closest(".rounded-lg.border")
      .find('input[type="number"]')
      .should("have.value", "9100");
    // 0.45 × 9100 = 4095
    cy.contains("€ 4095.00").should("exist");
  });
});
