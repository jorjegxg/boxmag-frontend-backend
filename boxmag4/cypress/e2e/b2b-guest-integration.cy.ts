/**
 * b2b-guest-integration (PAGES_TESTS_TODO2.md)
 *
 * Guest B2B order → skip account on success → admin Comenzi checks.
 * Also asserts internal notification email was sent (ORDERS_NOTIFICATION_TO / orders@).
 *
 * Requires frontend (:3006), backend (:3005), and MySQL.
 */

import {
  assertAdminOrderDetail,
  assertAdminTableRow,
  BACKEND_URL,
  CreateOrderBody,
  GUEST_EMAIL,
  placeB2bGuestOrder,
  setupGuestSession,
  STORAGE_KEY,
} from "../support/b2b-guest-helpers";

describe("b2b-guest-integration", () => {
  before(function () {
    cy.request({
      method: "GET",
      url: `${BACKEND_URL}/api/health`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        cy.log(
          `Skipping integration test: backend unavailable at ${BACKEND_URL}/api/health (status ${response.status})`,
        );
        this.skip();
      }
    });
  });

  beforeEach(() => {
    setupGuestSession();
    // Production frontend is built with api.boxmag.eu; Cypress on localhost:3006
    // cannot call that origin (CORS). Route API traffic to the local backend.
    cy.intercept("https://api.boxmag.eu/api/**", (req) => {
      req.url = req.url.replace(
        "https://api.boxmag.eu",
        BACKEND_URL || "http://localhost:3005",
      );
    });
    cy.intercept("POST", "**/api/orders").as("createOrder");
  });

  it("guest places order, skips account, admin Comenzi table and detail are correct", () => {
    placeB2bGuestOrder();

    cy.get<number>("@orderId").then((orderId) => {
      const notifyTo =
        (Cypress.env("ordersNotificationTo") as string) || "orders@boxmag.eu";
      cy.task("assertOrderNotificationEmailLog", {
        orderId,
        mustIncludeRecipient: "orders@boxmag.eu",
      });
      cy.log(
        `CHECK: backend sent order_notification_email_sent for orderId=${orderId} (ORDERS_NOTIFICATION_TO=${notifyTo})`,
      );
    });

    cy.contains("button", "No, thanks").click();
    cy.location("pathname").should("eq", "/");
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(STORAGE_KEY)).to.be.null;
    });

    cy.loginAdmin();
    cy.intercept("GET", "**/api/orders").as("getAdminOrders");
    cy.visit("/admin");
    cy.wait("@getAdminOrders");

    cy.get<CreateOrderBody>("@orderPayload").then((orderPayload) => {
      cy.get<string>("@orderNumber").then((orderNumber) => {
        assertAdminTableRow(orderNumber, orderPayload);
        cy.contains("tr", orderNumber).click();
        cy.location("pathname").should("match", /^\/admin\/orders\/\d+$/);
        assertAdminOrderDetail(orderNumber, orderPayload);

        cy.log(
          `MANUAL CHECK: open info@boxmag.eu and orders@boxmag.eu (Inbox + Spam) for subject "Cerere oferta noua ${orderNumber}".`,
        );
        cy.log(
          `MANUAL CHECK: open ${GUEST_EMAIL} and confirm the B2B order confirmation email for ${orderNumber} was received.`,
        );
      });
    });
  });
});
