/**
 * E2E tests - /admin/orders and /admin/orders/[id]
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

describe("Admin orders", () => {
  beforeEach(() => {
    cy.loginAdmin();
  });

  it("loads orders table from API", () => {
    cy.intercept("GET", "**/api/orders", {
      statusCode: 200,
      body: { ok: true, data: orders },
    }).as("getOrders");

    cy.visit("/admin/orders");
    cy.wait("@getOrders");

    cy.contains("Comenzi").should("exist");
    cy.contains("ORD-0042").should("exist");
    cy.contains("Ana Popescu").should("exist");
    cy.contains("Standard Boxes").should("exist");
  });

  it("opens order detail via order number link", () => {
    cy.intercept("GET", "**/api/orders", {
      statusCode: 200,
      body: { ok: true, data: orders },
    }).as("getOrders");
    cy.intercept("GET", "**/api/orders/42", {
      statusCode: 200,
      body: { ok: true, data: orderDetails },
    }).as("getOrderDetails");

    cy.visit("/admin/orders");
    cy.wait("@getOrders");

    cy.contains("a", "ORD-0042")
      .should("have.attr", "href", "/admin/orders/42")
      .click();
    cy.wait("@getOrderDetails");
    cy.location("pathname").should("eq", "/admin/orders/42");
    cy.contains("Detalii comandă").should("exist");
  });

  it("updates order status from orders table", () => {
    cy.intercept("GET", "**/api/orders", {
      statusCode: 200,
      body: { ok: true, data: orders },
    }).as("getOrders");
    cy.intercept("PATCH", "**/api/orders/42/status", {
      statusCode: 200,
      body: { ok: true, data: { id: 42, status: "in progress" } },
    }).as("patchOrderStatus");

    cy.visit("/admin/orders");
    cy.wait("@getOrders");

    cy.contains("tr", "ORD-0042").within(() => {
      cy.get("select").select("in progress");
    });

    cy.wait("@patchOrderStatus").its("request.body").should((body) => {
      expect(body.status).to.eq("in progress");
    });
  });

  it("opens admin order details and updates status", () => {
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

    cy.visit("/admin/orders");
    cy.wait("@getOrders");

    cy.contains("tr", "ORD-0042").click();
    cy.wait("@getOrderDetails");
    cy.location("pathname").should("eq", "/admin/orders/42");

    cy.contains("Detalii comandă").should("exist");
    cy.contains("ORD-0042").should("exist");
    cy.contains("Ana Popescu").should("exist");

    cy.contains("p", "Schimbă status")
      .parent()
      .find("select")
      .select("completed");
    cy.wait("@patchOrderStatusDetails").its("request.body").should((body) => {
      expect(body.status).to.eq("completed");
    });
    cy.contains("span", "Finalizată").should("exist");
  });

  it("shows Stripe payment badge without editable select (INV-STRIPE-LOCK)", () => {
    const stripeOrder = {
      ...orderDetails,
      paymentStatus: "paid",
      stripeSessionId: "cs_test_lock_123",
    };

    cy.intercept("GET", "**/api/orders/42", {
      statusCode: 200,
      body: { ok: true, data: stripeOrder },
    }).as("getStripeOrder");
    cy.intercept("PATCH", "**/api/orders/42/payment-status", {
      statusCode: 400,
      body: { ok: false, message: "Stripe-managed" },
    }).as("patchPayment");

    cy.visit("/admin/orders/42");
    cy.wait("@getStripeOrder");

    cy.contains("Plată Stripe").should("exist");
    cy.contains("Schimbă status plată").should("not.exist");
    cy.get("select").then(($selects) => {
      const paymentSelects = [...$selects].filter((el) =>
        /pending|paid|failed/i.test(el.textContent ?? ""),
      );
      expect(paymentSelects.length).to.eq(0);
    });
  });

  it("sends offer email from order detail", () => {
    const offerOrder = {
      ...orderDetails,
      paymentStatus: null,
      stripeSessionId: null,
      items: [],
      priceBreakdown: null,
    };

    cy.intercept("GET", "**/api/orders/42", {
      statusCode: 200,
      body: { ok: true, data: offerOrder },
    }).as("getOrderDetails");
    cy.intercept("GET", "**/api/orders/offer-senders", {
      statusCode: 200,
      body: {
        ok: true,
        data: [{ key: "orders", email: "orders@example.com", label: "Orders" }],
        defaultKey: "orders",
      },
    }).as("getOfferSenders");
    cy.intercept("POST", "**/api/orders/42/send-offer", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          to: "ana@example.com",
          offerSentFrom: "orders@example.com",
          offerSentAt: "2026-07-02T10:00:00.000Z",
        },
      },
    }).as("sendOffer");

    cy.visit("/admin/orders/42");
    cy.wait("@getOrderDetails");
    cy.wait("@getOfferSenders");

    cy.contains("h3", "Trimite email cu ofertă").scrollIntoView().should("exist");
    cy.contains("button", "Trimite email cu ofertă").should("be.visible").click();
    cy.wait("@sendOffer").its("response.statusCode").should("eq", 200);
    cy.contains(/Ofertă trimisă/i).should("exist");
  });

  it("shows error when send-offer returns 404", () => {
    const offerOrder = {
      ...orderDetails,
      paymentStatus: null,
      stripeSessionId: null,
      items: [],
      priceBreakdown: null,
    };

    cy.intercept("GET", "**/api/orders/42", {
      statusCode: 200,
      body: { ok: true, data: offerOrder },
    }).as("getOrderDetails");
    cy.intercept("GET", "**/api/orders/offer-senders", {
      statusCode: 200,
      body: {
        ok: true,
        data: [{ key: "orders", email: "orders@example.com", label: "Orders" }],
        defaultKey: "orders",
      },
    }).as("getOfferSenders");
    cy.intercept("POST", "**/api/orders/42/send-offer", {
      statusCode: 404,
      body: { ok: false, message: "Order not found" },
    }).as("sendOfferFail");

    cy.visit("/admin/orders/42");
    cy.wait("@getOrderDetails");
    cy.wait("@getOfferSenders");

    cy.contains("h3", "Trimite email cu ofertă").scrollIntoView().should("exist");
    cy.contains("button", "Trimite email cu ofertă").should("be.visible").click();
    cy.wait("@sendOfferFail");
    cy.contains(/Order not found|Nu s-a putut trimite/i).should("exist");
  });
});
