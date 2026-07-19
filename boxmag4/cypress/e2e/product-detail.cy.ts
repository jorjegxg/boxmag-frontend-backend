/**
 * E2E tests – /products/[key] (PDP)
 *
 * Acoperă:
 * - Galerie imagini + tabel tipuri de preț (doar 300 / 500 / Pallet, fără tier legacy <100)
 * - ?itemNo= selectează SKU-ul corect din listă și actualizează prețul afișat
 * - Selector de mărime (size-option) comută SKU + preț când tipul are mai multe produse
 * - Cantitate: butonul minus nu scade sub 100; butonul pallet adaugă 9000
 * - Add to cart scrie corect în localStorage (boxmag.cart)
 * - Tip de cutie / produs inexistent -> "Product not found."
 */

type MockBoxTypeImage = {
  id: number;
  url: string;
  sortOrder: number;
  altText: string | null;
  isPrimary: boolean;
};

type MockBoxType = {
  id: number;
  title: string;
  key: string;
  images: MockBoxTypeImage[];
  isActive: boolean;
};

type MockProduct = {
  id: number;
  boxTypeId: number;
  itemNo: string;
  productName: string;
  internalDimensionsMM?: { l: number; w: number; h: number };
  prices: Array<{ id: number; name: string; withoutTax: number; withTax: number }>;
};

const mockBoxType: MockBoxType = {
  id: 1,
  title: "Standard Boxes",
  key: "standard",
  images: [
    { id: 11, url: "/b2b/boxes/box.png", sortOrder: 1, altText: null, isPrimary: false },
    { id: 12, url: "/b2b/boxes/envelope.png", sortOrder: 0, altText: null, isPrimary: true },
  ],
  isActive: true,
};

const mockProducts: MockProduct[] = [
  {
    id: 101,
    boxTypeId: 1,
    itemNo: "STD-001",
    productName: "Standard Box 300x200",
    internalDimensionsMM: { l: 300, w: 200, h: 150 },
    prices: [
      { id: 1, name: "<100", withoutTax: 0.6, withTax: 0.714 },
      { id: 2, name: "300", withoutTax: 0.45, withTax: 0.5355 },
      { id: 3, name: "500", withoutTax: 0.4, withTax: 0.476 },
      { id: 4, name: "Pallet", withoutTax: 0.35, withTax: 0.4165 },
    ],
  },
  {
    id: 102,
    boxTypeId: 1,
    itemNo: "STD-002",
    productName: "Standard Box 400x300",
    internalDimensionsMM: { l: 400, w: 300, h: 200 },
    prices: [
      { id: 5, name: "300", withoutTax: 0.55, withTax: 0.6545 },
      { id: 6, name: "500", withoutTax: 0.5, withTax: 0.595 },
      { id: 7, name: "Pallet", withoutTax: 0.45, withTax: 0.5355 },
    ],
  },
];

const interceptPdpApis = (options: {
  boxTypes?: MockBoxType[];
  products?: MockProduct[];
} = {}) => {
  const boxTypes = options.boxTypes ?? [mockBoxType];
  const products = options.products ?? mockProducts;

  cy.intercept("GET", "**/api/box-types", {
    statusCode: 200,
    body: { ok: true, data: boxTypes },
  }).as("getBoxTypes");

  cy.intercept("GET", "**/api/box-types/1/products", {
    statusCode: 200,
    body: { ok: true, data: products },
  }).as("getProducts");
};

const visitPdp = (path: string) => {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem("boxmag.language", "en");
      win.localStorage.removeItem("boxmag.cart");
    },
  });
};

describe("/products/[key] – PDP", () => {
  it("încarcă galeria de imagini cu imaginea primary prima și tabelul de prețuri fără tier-ul legacy <100", () => {
    interceptPdpApis();
    visitPdp("/products/standard?itemNo=STD-001");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("h1", "Standard Box 300x200").should("be.visible");
    cy.contains("300 x 200 x 150 mm").should("be.visible");

    // primary image (envelope.png) trebuie să fie prima din galerie / imaginea mare
    cy.get('img[alt="Standard Box 300x200"]')
      .should("have.attr", "src")
      .and("include", "envelope.png");

    // 2 thumbnail-uri în galerie
    cy.get('button[aria-label^="Product image"]').should("have.length", 2);

    // doar 300 / 500 / Pallet apar, fără tier-ul <100
    cy.contains("span", "300").should("be.visible");
    cy.contains("span", "500").should("be.visible");
    cy.contains("span", "Pallet").should("be.visible");
    cy.contains("0.6").should("not.exist");
  });

  it("?itemNo= selectează SKU-ul corect și actualizează prețul afișat", () => {
    interceptPdpApis();
    visitPdp("/products/standard?itemNo=STD-002");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("h1", "Standard Box 400x300").should("be.visible");
    cy.contains(/Reference:\s*STD-002/).should("exist");
    // pret net implicit (100 buc x 0.55 fara TVA)
    cy.contains("€ 55.00").should("be.visible");
  });

  it("selectorul de mărime schimbă SKU-ul și prețul când tipul are mai multe produse", () => {
    interceptPdpApis();
    visitPdp("/products/standard?itemNo=STD-001");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("€ 45.00").should("be.visible"); // 100 x 0.45

    cy.get("#size-option").select("STD-002");
    cy.contains(/Reference:\s*STD-002/).should("exist");
    cy.contains("€ 55.00").should("be.visible"); // 100 x 0.55
  });

  it("cantitatea nu scade sub 100", () => {
    interceptPdpApis();
    visitPdp("/products/standard?itemNo=STD-001");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("span", "100").should("be.visible");
    cy.get('button[aria-label="Decrease quantity"]').click();
    cy.get('button[aria-label="Decrease quantity"]').click();
    cy.contains("span", "100").should("be.visible"); // rămâne la minim
  });

  /**
   * BUG găsit: pe /boxesfetco (ProductTable) butonul de pallet ADAUGĂ la cantitatea
   * curentă (100 + 9000 = 9100), dar pe PDP (/products/[key]) butonul de pallet
   * SUPRASCRIE cantitatea cu exact 9000 când cantitatea curentă e sub un pallet
   * (vezi app/products/[key]/page.tsx: `prev < BOXES_PER_PALLET ? BOXES_PER_PALLET : prev + BOXES_PER_PALLET`).
   * Testul de mai jos documentează comportamentul REAL (buggy) al PDP-ului.
   */
  it("[BUG] butonul + 9000 suprascrie cantitatea cu 9000 în loc s-o adune la cei 100 existenți", () => {
    interceptPdpApis();
    visitPdp("/products/standard?itemNo=STD-001");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("span", "100").should("be.visible");
    cy.contains("button", "+ 9000").click();
    cy.contains("span", "9000").should("be.visible");
    cy.contains("span", "9100").should("not.exist");
  });

  it("Add to cart adaugă produsul selectat în localStorage (boxmag.cart)", () => {
    interceptPdpApis();
    visitPdp("/products/standard?itemNo=STD-001");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("button", "Add to cart").click();

    cy.window().then((win) => {
      const raw = win.localStorage.getItem("boxmag.cart");
      expect(raw, "boxmag.cart exists").to.be.a("string").and.not.be.empty;
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: Array<{ itemNo: string; quantity: number; unitPrice: number }> };
      };
      const items = parsed.state?.items ?? [];
      const match = items.find((i) => i.itemNo === "STD-001");
      expect(match, "STD-001 in cart").to.exist;
      expect(match?.quantity).to.eq(100);
      expect(match?.unitPrice).to.eq(0.45);
    });
  });

  it("tip de cutie inexistent afișează 'Product not found.'", () => {
    interceptPdpApis();
    visitPdp("/products/does-not-exist");
    cy.wait(["@getBoxTypes"]);
    cy.contains("Product not found.").should("be.visible");
  });

  it("box type inactiv nu e găsit pe PDP", () => {
    interceptPdpApis({
      boxTypes: [{ ...mockBoxType, isActive: false }],
    });
    visitPdp("/products/standard");
    cy.wait(["@getBoxTypes"]);
    cy.contains("Product not found.").should("be.visible");
  });
});
