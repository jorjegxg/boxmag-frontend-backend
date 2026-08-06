/**
 * E2E — account order detail + reorder to cart
 */

import {
  AUTH_EMAIL_STORAGE_KEY,
  AUTH_STORAGE_KEY,
  CART_STORAGE_KEY,
  TEST_EMAIL,
} from "../support/commands";

const orderDetails = {
  id: 77,
  orderNumber: "ORD-0077",
  boxTypeName: "Standard Boxes",
  cardboardType: "B Wave",
  cardboardColour: "Brown",
  boxPrint: "No Color",
  quantity: 200,
  transport: "Standard Delivery",
  size: "400 x 300 x 200 mm",
  status: "completed",
  paymentStatus: "paid",
  companyName: "Boxmag SRL",
  customerName: "John Doe",
  email: TEST_EMAIL,
  phone: "799111222",
  city: "Radauti",
  country: "RO",
  message: "Stripe checkout cart order",
  items: [
    {
      itemNo: "STD-001",
      name: "Standard Box 400x300",
      unitPrice: 12,
      quantity: 200,
      lineTotal: 2400,
      imageUrl: null,
    },
  ],
  priceBreakdown: {
    subtotal: 2400,
    vatPercent: 21,
    vatAmount: 504,
    shipping: 25,
    total: 2929,
    currency: "eur",
    shippingMethod: "Standard Delivery",
    shippingEta: "Estimated 7-10 days",
  },
  attachmentName: null,
  hasAttachment: false,
  createdAt: "2026-05-28T08:00:00.000Z",
};

describe("Account order detail + reorder", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/auth/profile*", {
      statusCode: 200,
      body: {
        ok: true,
        data: {
          firstName: "John",
          lastName: "Doe",
          phone: "799111222",
          email: TEST_EMAIL,
        },
      },
    });
    cy.intercept("GET", "**/api/orders/77*", {
      statusCode: 200,
      body: { ok: true, data: orderDetails },
    }).as("getOrder");
  });

  it("shows order detail and adds items to cart", () => {
    cy.visit("/account/orders/77", {
      onBeforeLoad(win) {
        win.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        win.localStorage.setItem(AUTH_EMAIL_STORAGE_KEY, TEST_EMAIL);
        win.localStorage.removeItem(CART_STORAGE_KEY);
      },
    });
    cy.wait("@getOrder");

    cy.contains("ORD-0077").should("exist");
    cy.contains("Standard Box 400x300").should("exist");
    cy.contains("button", "Add this order to cart").click();

    cy.window().then((win) => {
      const raw = win.localStorage.getItem(CART_STORAGE_KEY);
      expect(raw).to.be.a("string");
      const parsed = JSON.parse(raw as string) as {
        state?: { items?: Array<{ itemNo: string; quantity: number }> };
      };
      expect(parsed.state?.items?.[0]?.itemNo).to.eq("STD-001");
      expect(parsed.state?.items?.[0]?.quantity).to.eq(200);
    });
  });
});
