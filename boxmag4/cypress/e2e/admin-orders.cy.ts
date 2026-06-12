/**
 * E2E tests - /admin and /admin/orders/[id]
 *
 * Coverage:
 * - loads orders table
 * - updates order status from admin list
 * - opens order details and updates status
 */

type AdminOrderRow = {
  id: number;
  orderNumber: string;
  customerName: string;
  companyName: string;
  boxTypeName: string;
  cardboardType: string;
  cardboardColour: string;
  boxPrint: string;
  size: string;
  transport: string;
  quantity: number;
  attachmentName: string | null;
  message: string;
  status: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  createdAt: string;
};

const orders: AdminOrderRow[] = [
  {
    id: 42,
    orderNumber: "ORD-0042",
    customerName: "Ana Popescu",
    companyName: "Boxmag SRL",
    boxTypeName: "Standard Boxes",
    cardboardType: "B Wave",
    cardboardColour: "Brown",
    boxPrint: "No Color",
    size: "400 x 300 x 200 mm",
    transport: "Standard Delivery",
    quantity: 500,
    attachmentName: null,
    message: "Please handle with care",
    status: "new",
    email: "ana@example.com",
    phone: "799111222",
    city: "Radauti",
    country: "RO",
    createdAt: "2026-05-28T08:00:00.000Z",
  },
];

const orderDetails = {
  id: 42,
  orderNumber: "ORD-0042",
  boxTypeName: "Standard Boxes",
  cardboardType: "B Wave",
  cardboardColour: "Brown",
  boxPrint: "No Color",
  quantity: 500,
  transport: "Standard Delivery",
  size: "400 x 300 x 200 mm",
  status: "new",
  paymentStatus: "paid",
  companyName: "Boxmag SRL",
  customerName: "Ana Popescu",
  email: "ana@example.com",
  phone: "799111222",
  city: "Radauti",
  country: "RO",
  message: "Please handle with care",
  items: [
    {
      itemNo: "STD-001",
      name: "Standard Box 400x300",
      unitPrice: 12,
      quantity: 500,
      lineTotal: 6000,
      imageUrl: null,
    },
  ],
  priceBreakdown: {
    subtotal: 6000,
    vatPercent: 21,
    vatAmount: 1260,
    shipping: 25,
    total: 7285,
    currency: "eur",
    shippingMethod: "Standard Delivery",
    shippingEta: "Estimated 7-10 days",
  },
  attachmentName: null,
  createdAt: "2026-05-28T08:00:00.000Z",
};

const interceptAdminPrerequisites = () => {
  cy.intercept("GET", "**/api/box-types", {
    statusCode: 200,
    body: { ok: true, data: [] },
  }).as("getBoxTypes");

  cy.intercept("GET", "**/api/shipping-methods?includeInactive=true", {
    statusCode: 200,
    body: { ok: true, data: [] },
  }).as("getShippingMethodsAdmin");
};

describe("Admin orders", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("loads orders table from API", () => {
    interceptAdminPrerequisites();
    cy.intercept("GET", "**/api/orders", {
      statusCode: 200,
      body: { ok: true, data: orders },
    }).as("getOrders");

    cy.visit("/admin");
    cy.wait(["@getBoxTypes", "@getShippingMethodsAdmin", "@getOrders"]);

    cy.contains("Orders").should("exist");
    cy.contains("ORD-0042").should("exist");
    cy.contains("Ana Popescu").should("exist");
    cy.contains("Standard Boxes").should("exist");
  });

  it("updates order status from orders table", () => {
    interceptAdminPrerequisites();
    cy.intercept("GET", "**/api/orders", {
      statusCode: 200,
      body: { ok: true, data: orders },
    }).as("getOrders");
    cy.intercept("PATCH", "**/api/orders/42/status", {
      statusCode: 200,
      body: { ok: true, data: { id: 42, status: "in progress" } },
    }).as("patchOrderStatus");

    cy.visit("/admin");
    cy.wait(["@getBoxTypes", "@getShippingMethodsAdmin", "@getOrders"]);

    cy.contains("tr", "ORD-0042").within(() => {
      cy.get("select").select("in progress");
    });

    cy.wait("@patchOrderStatus").its("request.body").should((body) => {
      expect(body.status).to.eq("in progress");
    });
  });

  it("opens admin order details and updates status", () => {
    interceptAdminPrerequisites();
    cy.intercept("GET", "**/api/orders", {
      statusCode: 200,
      body: { ok: true, data: orders },
    }).as("getOrders");
    cy.intercept("GET", "**/api/orders/42", {
      statusCode: 200,
      body: { ok: true, data: orderDetails },
    }).as("getOrderDetails");
    cy.intercept("PATCH", "**/api/orders/42/status", {
      statusCode: 200,
      body: { ok: true, data: { id: 42, status: "completed" } },
    }).as("patchOrderStatusDetails");

    cy.visit("/admin");
    cy.wait(["@getBoxTypes", "@getShippingMethodsAdmin", "@getOrders"]);

    cy.contains("tr", "ORD-0042").click();
    cy.wait("@getOrderDetails");
    cy.location("pathname").should("eq", "/admin/orders/42");

    cy.contains("Order details").should("exist");
    cy.contains("ORD-0042").should("exist");
    cy.contains("Ana Popescu").should("exist");

    cy.get("select").first().select("completed");
    cy.wait("@patchOrderStatusDetails").its("request.body").should((body) => {
      expect(body.status).to.eq("completed");
    });
    cy.contains("span", "completed").should("exist");
  });
});
