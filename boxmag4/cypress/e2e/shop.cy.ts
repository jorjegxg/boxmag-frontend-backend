/**
 * E2E tests – /shop
 *
 * Acoperă:
 * - loading state
 * - încărcare categorii + un card per tip de cutie (nu per dimensiune)
 * - filtrare pe boxTypeId (query param)
 * - add to cart (persist în localStorage / zustand persist)
 */

type MockBoxType = {
  id: number;
  title: string;
  key: string;
  images: Array<{
    id: number;
    url: string;
    sortOrder: number;
    altText: string | null;
    isPrimary: boolean;
  }>;
  isActive: boolean;
};

type MockProduct = {
  id: number;
  boxTypeId: number;
  itemNo: string;
  productName: string;
  internalDimensionsMM?: { l: number; w: number; h: number };
  prices?: Array<{ id: number; name: string; withoutTax: number; withTax: number }>;
};

const mockBoxTypes: MockBoxType[] = [
  {
    id: 1,
    title: "Standard Boxes",
    key: "standard",
    images: [
      {
        id: 11,
        url: "/b2b/boxes/box.png",
        sortOrder: 1,
        altText: null,
        isPrimary: true,
      },
    ],
    isActive: true,
  },
  {
    id: 2,
    title: "Inactive Type",
    key: "inactive",
    images: [],
    isActive: false,
  },
  {
    id: 3,
    title: "Custom Mailers",
    key: "mailers",
    images: [
      {
        id: 33,
        url: "/b2b/boxes/box.png",
        sortOrder: 1,
        altText: null,
        isPrimary: true,
      },
    ],
    isActive: true,
  },
  {
    id: 4,
    title: "Pizza Boxes",
    key: "pizza",
    images: [
      {
        id: 44,
        url: "/b2b/boxes/box.png",
        sortOrder: 1,
        altText: null,
        isPrimary: true,
      },
    ],
    isActive: true,
  },
];

const productsByType: Record<number, MockProduct[]> = {
  1: [
    {
      id: 101,
      boxTypeId: 1,
      itemNo: "STD-001",
      productName: "Standard Box 300x200",
      internalDimensionsMM: { l: 300, w: 200, h: 150 },
      prices: [{ id: 1, name: "300", withoutTax: 10, withTax: 11.9 }],
    },
    {
      id: 102,
      boxTypeId: 1,
      itemNo: "STD-002",
      productName: "Standard Box 400x300",
      prices: [{ id: 2, name: "300", withoutTax: 12, withTax: 14.28 }],
    },
  ],
  3: [
    {
      id: 301,
      boxTypeId: 3,
      itemNo: "MLR-001",
      productName: "Mailer 250x180",
      internalDimensionsMM: { l: 250, w: 180, h: 60 },
      prices: [{ id: 3, name: "300", withoutTax: 5, withTax: 5.95 }],
    },
  ],
  4: [
    {
      id: 401,
      boxTypeId: 4,
      itemNo: "PZ-001",
      productName: "Pizza Box 320",
      prices: [{ id: 4, name: "300", withoutTax: 2, withTax: 2.38 }],
    },
  ],
};

/** Shop salvează imageUrl cu backend host; checkout folosește next/image – normalizăm pentru test. */
const normalizeCartImageUrlsForCheckout = () => {
  cy.window().then((win) => {
    const raw = win.localStorage.getItem("boxmag.cart");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      state?: { items?: Array<{ imageUrl?: string }> };
    };
    const items = parsed.state?.items;
    if (!items?.length) return;
    for (const item of items) {
      if (item.imageUrl?.includes("/b2b/boxes/box.png")) {
        item.imageUrl = "/b2b/boxes/box.png";
      }
    }
    win.localStorage.setItem("boxmag.cart", JSON.stringify(parsed));
  });
};

const interceptShopApis = (options: { boxTypes?: MockBoxType[] } = {}) => {
  const boxTypes = options.boxTypes ?? mockBoxTypes;

  cy.intercept("GET", "**/api/box-types", {
    statusCode: 200,
    body: { ok: true, data: boxTypes },
  }).as("getBoxTypes");

  cy.intercept("GET", "**/api/box-types/*/products", (req) => {
    const match = req.url.match(/\/api\/box-types\/(\d+)\/products/);
    const boxTypeId = match ? Number(match[1]) : NaN;
    const data = Number.isFinite(boxTypeId) ? productsByType[boxTypeId] ?? [] : [];
    req.reply({ statusCode: 200, body: { ok: true, data } });
  }).as("getProducts");
};

describe("/shop", () => {
  it("afișează Loading shop... cât timp se încarcă", () => {
    interceptShopApis();
    cy.intercept("GET", "**/api/box-types", (req) => {
      req.reply((res) => {
        res.setDelay(700);
        res.send({ statusCode: 200, body: { ok: true, data: mockBoxTypes } });
      });
    }).as("slowBoxTypes");

    cy.visit("/shop");
    cy.contains("Loading shop...").should("exist");
    cy.wait("@slowBoxTypes");
    cy.contains("Loading shop...").should("not.exist");
  });

  it("afișează categoriile active și produsele", () => {
    interceptShopApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    // sidebar categories: All + active types only
    cy.contains("a", "All").should("exist");
    cy.contains("a", "Standard Boxes").should("exist");
    cy.contains("a", "Custom Mailers").should("exist");
    cy.contains("a", "Inactive Type").should("not.exist");

    // one card per box type, not one per size
    cy.get("article").should("have.length", 3);
    cy.contains("article", "Standard Boxes").within(() => {
      cy.contains("2 sizes available").should("exist");
      // STD-002 has no dimensions, so the range comes from STD-001 only
      cy.contains("300 x 200 x 150 mm").should("exist");
      // cheapest "300" tier across sizes
      cy.contains("from € 11.90").should("exist");
      cy.contains("Choose size").should("exist");
      cy.contains("button", "Add to cart").should("not.exist");
    });
    cy.contains("article", "Custom Mailers").within(() => {
      cy.contains("Code: MLR-001").should("exist");
      cy.contains("Size: 250 x 180 x 60 mm").should("exist");
      cy.contains("button", "Add to cart").should("exist");
    });
    cy.contains("Standard Box 400x300").should("not.exist");
  });

  it("filtrează produsele când boxTypeId e setat în query", () => {
    interceptShopApis();

    cy.visit("/shop?boxTypeId=3");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.get("article").should("have.length", 1);
    cy.contains("article", "Custom Mailers").should("exist");
    cy.contains("article", "Standard Boxes").should("not.exist");
  });

  it("afișează mesaj când filtrul nu are produse", () => {
    // Important: pagina ignoră boxTypeId invalid și revine la "All".
    // Ca să testăm "0 produse", folosim un boxType VALID dar mock-uim produse = [].
    cy.intercept("GET", "**/api/box-types", {
      statusCode: 200,
      body: {
        ok: true,
        data: [
          {
            id: 9,
            title: "Empty Category",
            key: "empty",
            images: [],
            isActive: true,
          },
        ],
      },
    }).as("getBoxTypes");

    cy.intercept("GET", "**/api/box-types/9/products", {
      statusCode: 200,
      body: { ok: true, data: [] },
    }).as("getProducts");

    cy.visit("/shop?boxTypeId=9");
    cy.wait(["@getBoxTypes", "@getProducts"]);
    cy.contains(
      /No products for the selected filter|Nu există produse pentru filtrul selectat|Keine Produkte für den ausgewählten Filter/i,
    ).should("exist");
  });

  it("Add to cart adaugă produsul în localStorage (boxmag.cart)", () => {
    interceptShopApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("article", "Custom Mailers")
      .contains("button", "Add to cart")
      .click();

    cy.window().then((win) => {
      const raw = win.localStorage.getItem("boxmag.cart");
      expect(raw, "boxmag.cart exists").to.be.a("string").and.not.be.empty;
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: Array<{ itemNo: string; name: string; quantity: number }> };
      };
      const items = parsed.state?.items ?? [];
      expect(items.some((i) => i.itemNo === "MLR-001" && i.quantity >= 100)).to.eq(true);
    });
  });

  it("card cu o dimensiune: Add to cart nu navighează, click pe card duce la /products/<key>?itemNo=", () => {
    interceptShopApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    // click pe add-to-cart nu schimbă URL (event.preventDefault/stopPropagation)
    cy.contains("article", "Custom Mailers")
      .contains("button", "Add to cart")
      .click();
    cy.location("pathname").should("eq", "/shop");

    cy.contains("article", "Custom Mailers").click();
    cy.location("pathname").should("match", /\/products\/mailers$/);
    cy.location("search").should("contain", "itemNo=MLR-001");
  });

  it("card cu mai multe dimensiuni duce la /products/<key> fără itemNo (dimensiunea se alege pe PDP)", () => {
    interceptShopApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("article", "Standard Boxes").click();
    cy.location("pathname").should("match", /\/products\/standard$/);
    cy.location("search").should("not.contain", "itemNo=");
  });
});

describe("/shop → /checkout (produse în coș)", () => {
  it("produsul adăugat în shop apare în pagina de checkout", () => {
    interceptShopApis();
    cy.mockCheckoutApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("article", "Custom Mailers")
      .contains("button", "Add to cart")
      .click();

    normalizeCartImageUrlsForCheckout();
    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("Cart is empty.").should("not.exist");
    cy.contains("MLR-001").should("exist");
    cy.contains("Mailer 250x180").should("exist");
    cy.contains("€ 500.00").should("exist");
  });

  it("mai multe produse adăugate în shop apar toate în checkout", () => {
    interceptShopApis();
    cy.mockCheckoutApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("article", "Custom Mailers")
      .contains("button", "Add to cart")
      .click();
    cy.contains("article", "Pizza Boxes")
      .contains("button", "Add to cart")
      .click();

    normalizeCartImageUrlsForCheckout();
    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("MLR-001").should("exist");
    cy.contains("PZ-001").should("exist");
    cy.contains("Mailer 250x180").should("exist");
    cy.contains("Pizza Box 320").should("exist");
    // subtotal: (5 + 2) * 100 = 700 (fără TVA, cum e în coș)
    cy.contains("€ 700.00").should("exist");
  });

  it("coșul gol în checkout după ce nu s-a adăugat nimic din shop", () => {
    interceptShopApis();
    cy.mockCheckoutApis();

    cy.visit("/shop", {
      onBeforeLoad(win) {
        win.localStorage.removeItem("boxmag.cart");
      },
    });
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.visit("/checkout");
    cy.wait("@getShippingMethods");
    cy.contains("Cart is empty.").should("exist");
  });
});

