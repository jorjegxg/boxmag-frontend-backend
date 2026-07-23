/**
 * Asserts B2B order creation sends the internal notification email
 * (ORDERS_NOTIFICATION_TO must include orders@boxmag.eu).
 *
 * Hits the local backend directly — no UI dependency.
 */

import { BACKEND_URL } from "../support/b2b-guest-helpers";

const ORDER_PAYLOAD = {
  boxTypeName: "Cypress Email Notify Box",
  cardboardType: "B Wave",
  cardboardColour: "Brown On Both Side",
  boxPrint: "No Color",
  sizeType: "Internal Size - mm",
  transport: "Own",
  quantity: 500,
  message: `Cypress orders@ notification check ${new Date().toISOString()}`,
  acceptedTerms: true,
  firstName: "Cypress",
  surname: "Notify",
  companyName: "Cypress Notify SRL",
  email: "yotrevorgxg@gmail.com",
  phone: "+40799111222",
  address: "Str. Test 10",
  postcode: "010101",
  city: "Bucuresti",
  country: "RO",
  lengthMm: 400,
  widthMm: 300,
  heightMm: 200,
};

describe("b2b-order-email-notification", () => {
  before(function () {
    cy.request({
      method: "GET",
      url: `${BACKEND_URL}/api/health`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        cy.log(`Skipping: backend unavailable (${response.status})`);
        this.skip();
      }
    });
  });

  it("POST /api/orders sends notification that includes orders@boxmag.eu", () => {
    cy.request({
      method: "POST",
      url: `${BACKEND_URL}/api/orders`,
      body: ORDER_PAYLOAD,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, "create order status").to.eq(201);
      expect(response.body.ok).to.eq(true);
      expect(
        response.body.data?.emailsSent?.notification,
        "internal notification email sent",
      ).to.eq(true);
      expect(
        response.body.data?.emailsSent?.customerConfirmation,
        "customer confirmation email sent",
      ).to.eq(true);

      const orderId = response.body.data.id as number;
      expect(orderId).to.be.a("number");

      cy.task("assertOrderNotificationEmailLog", {
        orderId,
        mustIncludeRecipient: "orders@boxmag.eu",
      });

      cy.log(
        `CHECK: orderId=${orderId} notification logged to ORDERS_NOTIFICATION_TO (includes orders@boxmag.eu)`,
      );
      cy.log(
        `MANUAL CHECK: inbox/spam for info@boxmag.eu and orders@boxmag.eu — subject "Cerere oferta noua ORD-${String(orderId).padStart(4, "0")}"`,
      );
    });
  });
});
