/**
 * E2E — admin box type edit page smoke (mocked API)
 */

const boxType = {
  id: 3,
  title: "Test Boxes",
  key: "test-boxes",
  isActive: true,
  images: [
    {
      id: 1,
      url: "/placeholders/box.png",
      sortOrder: 0,
      altText: null,
      isPrimary: true,
    },
  ],
};

const products = [
  {
    id: 10,
    boxTypeId: 3,
    itemNo: "TB-001",
    productName: "Test Box 300",
    internalDimensionsMM: { l: 300, w: 200, h: 150 },
    qualityCardboard: "BC",
    palletDimensionsCM: { l: 120, w: 80, h: 100 },
    weightPieceGr: 100,
    weightPalletKg: 200,
    amountQtyInPcs: 100,
    palletPcs: 9000,
    prices: [
      { name: "300", withoutTax: 1.1 },
      { name: "500", withoutTax: 1.0 },
      { name: "Pallet", withoutTax: 0.9 },
    ],
  },
];

describe("Admin box type edit", () => {
  beforeEach(() => {
    cy.loginAdmin();
    cy.intercept("GET", "**/api/box-types", {
      statusCode: 200,
      body: { ok: true, data: [boxType] },
    }).as("getBoxTypes");
    cy.intercept("GET", "**/api/box-types/3/products", {
      statusCode: 200,
      body: { ok: true, data: products },
    }).as("getProducts");
  });

  it("loads edit form with title and product tiers", () => {
    cy.visit("/admin/box-types/3/edit");
    cy.wait(["@getBoxTypes", "@getProducts"]);
    cy.contains("h1", "Editare tip cutie").should("exist");
    cy.get('input[value="TB-001"]').should("exist");
    cy.contains("Salvează").should("exist");
  });
});
