/**
 * E2E tests – /shop
 *
 * Acoperă:
 * - loading state
 * - încărcare categorii + produse din API (mock)
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
];

const productsByType: Record<number, MockProduct[]> = {
  1: [
    {
      id: 101,
      boxTypeId: 1,
      itemNo: "STD-001",
      productName: "Standard Box 300x200",
      internalDimensionsMM: { l: 300, w: 200, h: 150 },
      prices: [{ id: 1, name: "Base", withoutTax: 10, withTax: 11.9 }],
    },
    {
      id: 102,
      boxTypeId: 1,
      itemNo: "STD-002",
      productName: "Standard Box 400x300",
      prices: [{ id: 2, name: "Base", withoutTax: 12, withTax: 14.28 }],
    },
  ],
  3: [
    {
      id: 301,
      boxTypeId: 3,
      itemNo: "MLR-001",
      productName: "Mailer 250x180",
      prices: [{ id: 3, name: "Base", withoutTax: 5, withTax: 5.95 }],
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

    // products from both active types
    cy.contains("Standard Box 300x200").should("exist");
    cy.contains("Standard Box 400x300").should("exist");
    cy.contains("Mailer 250x180").should("exist");
  });

  it("filtrează produsele când boxTypeId e setat în query", () => {
    interceptShopApis();

    cy.visit("/shop?boxTypeId=3");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("Mailer 250x180").should("exist");
    cy.contains("Standard Box 300x200").should("not.exist");
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
    cy.contains("Nu exista produse pentru filtrul selectat.").should("exist");
  });

  it("Add to cart adaugă produsul în localStorage (boxmag.cart)", () => {
    interceptShopApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("article", "Standard Box 300x200")
      .contains("button", "Add to cart")
      .click();

    cy.window().then((win) => {
      const raw = win.localStorage.getItem("boxmag.cart");
      expect(raw, "boxmag.cart exists").to.be.a("string").and.not.be.empty;
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: Array<{ itemNo: string; name: string; quantity: number }> };
      };
      const items = parsed.state?.items ?? [];
      expect(items.some((i) => i.itemNo === "STD-001" && i.quantity >= 100)).to.eq(true);
    });
  });

  it("click pe card navighează spre /products/<boxTypeKey> cu itemNo, dar click pe Add to cart nu navighează", () => {
    interceptShopApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    // click pe add-to-cart nu schimbă URL (event.preventDefault/stopPropagation)
    cy.contains("article", "Standard Box 300x200")
      .contains("button", "Add to cart")
      .click();
    cy.location("pathname").should("eq", "/shop");

    // click pe card (link) navighează către detalii (pentru tip cu key valid)
    cy.contains("Standard Box 300x200").click();
    cy.location("pathname").should("match", /\/products\/standard$/);
    cy.location("search").should("contain", "itemNo=STD-001");
  });
});

describe("/shop → /checkout (produse în coș)", () => {
  it("produsul adăugat în shop apare în pagina de checkout", () => {
    interceptShopApis();
    cy.mockCheckoutApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("article", "Standard Box 300x200")
      .contains("button", "Add to cart")
      .click();

    normalizeCartImageUrlsForCheckout();
    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("Cart is empty.").should("not.exist");
    cy.contains("STD-001").should("exist");
    cy.contains("Standard Box 300x200").should("exist");
    cy.contains("€ 1000.00").should("exist");
  });

  it("mai multe produse adăugate în shop apar toate în checkout", () => {
    interceptShopApis();
    cy.mockCheckoutApis();

    cy.visit("/shop");
    cy.wait(["@getBoxTypes", "@getProducts"]);

    cy.contains("article", "Standard Box 300x200")
      .contains("button", "Add to cart")
      .click();
    cy.contains("article", "Standard Box 400x300")
      .contains("button", "Add to cart")
      .click();

    normalizeCartImageUrlsForCheckout();
    cy.visit("/checkout");
    cy.wait("@getShippingMethods");

    cy.contains("STD-001").should("exist");
    cy.contains("STD-002").should("exist");
    cy.contains("Standard Box 300x200").should("exist");
    cy.contains("Standard Box 400x300").should("exist");
    // subtotal: (10 + 12) * 100 = 2200 (fără TVA, cum e în coș)
    cy.contains("€ 2200.00").should("exist");
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

