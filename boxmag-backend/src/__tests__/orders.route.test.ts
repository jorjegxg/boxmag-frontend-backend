import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserSessionToken } from "../config/user-auth";
import { USER_COOKIE_NAME } from "../config/user-auth";

const {
  queryMock,
  executeMock,
  getConnectionMock,
  isOrderEmailTransportConfiguredMock,
  sendOrderCreationEmailsMock,
  sendOrderOfferEmailToCustomerMock,
  getOrderAttachmentFromMinioMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  executeMock: vi.fn(),
  getConnectionMock: vi.fn(),
  isOrderEmailTransportConfiguredMock: vi.fn(() => true),
  sendOrderCreationEmailsMock: vi.fn(async () => ({
    notification: true,
    customerConfirmation: true,
    errors: [],
  })),
  sendOrderOfferEmailToCustomerMock: vi.fn(async () => undefined),
  getOrderAttachmentFromMinioMock: vi.fn(async () => ({
    buffer: Buffer.from("sample attachment"),
    contentType: "application/pdf",
    size: 17,
  })),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
    getConnection: getConnectionMock,
  },
}));

vi.mock("../services/email", () => ({
  isOrderEmailTransportConfigured: isOrderEmailTransportConfiguredMock,
  getOrderOfferSenderOptions: vi.fn(() => [
    { key: "orders", email: "orders@example.com", label: "Orders" },
  ]),
  resolveDefaultOrderOfferFromKey: vi.fn(() => "orders"),
  sendOrderCreationEmails: sendOrderCreationEmailsMock,
  sendOrderOfferEmailToCustomer: sendOrderOfferEmailToCustomerMock,
}));

vi.mock("../services/minio", () => ({
  uploadOrderAttachmentToMinio: vi.fn(async () => ({
    objectName: "orders/attachments/test.pdf",
  })),
  getOrderAttachmentFromMinio: getOrderAttachmentFromMinioMock,
  parseOrderAttachmentObjectNameFromUrl: vi.fn(
    (attachmentUrl: string) => {
      const marker = "/orders/attachments/";
      const index = attachmentUrl.indexOf(marker);
      if (index < 0) return null;
      return attachmentUrl.slice(index + 1);
    },
  ),
}));

import { app } from "../app";
import { getOrderAttachmentFromMinio } from "../services/minio";

describe("orders routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
    getOrderAttachmentFromMinioMock.mockReset();
    getOrderAttachmentFromMinioMock.mockResolvedValue({
      buffer: Buffer.from("sample attachment"),
      contentType: "application/pdf",
      size: 17,
    });
    sendOrderCreationEmailsMock.mockReset();
    sendOrderCreationEmailsMock.mockResolvedValue({
      notification: true,
      customerConfirmation: true,
      errors: [],
    });
    isOrderEmailTransportConfiguredMock.mockReset();
    isOrderEmailTransportConfiguredMock.mockReturnValue(true);
    sendOrderOfferEmailToCustomerMock.mockReset();
    process.env.ADMIN_PASSWORD = "test-admin-password";
    process.env.USER_SESSION_SECRET = "test-user-session-secret";
  });

  function adminCookieHeader(): Promise<string> {
    return import("../config/admin-auth").then(
      ({ createAdminSessionToken }) =>
        `boxmag-admin-session=${createAdminSessionToken("test-admin-password")}`,
    );
  }

  it("returns 401 for invalid status transition without admin auth", async () => {
    const response = await request(app)
      .patch("/api/orders/12/status")
      .send({ status: "unknown-status" });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid status transition payload when admin", async () => {
    const { createAdminSessionToken } = await import("../config/admin-auth");
    const adminCookie = `boxmag-admin-session=${createAdminSessionToken("test-admin-password")}`;

    const response = await request(app)
      .patch("/api/orders/12/status")
      .set("Cookie", adminCookie)
      .send({ status: "unknown-status" });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid order status value");
  });

  it("returns 400 for legacy done status when admin", async () => {
    const { createAdminSessionToken } = await import("../config/admin-auth");
    const adminCookie = `boxmag-admin-session=${createAdminSessionToken("test-admin-password")}`;

    const response = await request(app)
      .patch("/api/orders/12/status")
      .set("Cookie", adminCookie)
      .send({ status: "done" });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid order status value");
  });

  it("returns 400 when create order payload is missing required fields", async () => {
    const response = await request(app).post("/api/orders").send({
      boxTypeName: "Standard Box",
      quantity: 100,
    });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain("Invalid order payload");
  });

  it("returns order attachment for authorized account email", async () => {
    const userEmail = "customer@example.com";
    const token = createUserSessionToken(7, userEmail);
    if (!token) throw new Error("Failed to create user session token");

    queryMock.mockResolvedValueOnce([
      [
        {
          id: 12,
          attachment_name: "specs.pdf",
          attachment_object_name: "orders/attachments/specs.pdf",
          attachment_url: "http://localhost:9000/bucket/orders/attachments/specs.pdf",
        },
      ],
    ]);

    const response = await request(app)
      .get("/api/orders/12/attachment")
      .query({ email: userEmail })
      .set("Cookie", `${USER_COOKIE_NAME}=${token}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain("specs.pdf");
    expect(Buffer.from(response.body).toString()).toBe("sample attachment");
    expect(getOrderAttachmentFromMinio).toHaveBeenCalledWith(
      "orders/attachments/specs.pdf",
    );
  });

  it("loads legacy attachment via MinIO SDK when only public URL is stored", async () => {
    const userEmail = "customer@example.com";
    const token = createUserSessionToken(7, userEmail);
    if (!token) throw new Error("Failed to create user session token");

    queryMock.mockResolvedValueOnce([
      [
        {
          id: 15,
          attachment_name: "legacy.pdf",
          attachment_object_name: null,
          attachment_url:
            "http://localhost:9000/boxmag4-images/orders/attachments/legacy.pdf",
        },
      ],
    ]);

    const response = await request(app)
      .get("/api/orders/15/attachment")
      .query({ email: userEmail })
      .set("Cookie", `${USER_COOKIE_NAME}=${token}`);

    expect(response.status).toBe(200);
    expect(getOrderAttachmentFromMinio).toHaveBeenCalledWith(
      "orders/attachments/legacy.pdf",
    );
    expect(Buffer.from(response.body).toString()).toBe("sample attachment");
  });

  it("links business order to user when accountEmail matches order email", async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([{ insertId: 42, affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const connectionExecute = vi
      .fn()
      .mockResolvedValueOnce([{ insertId: 42, affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const connection = {
      beginTransaction: vi.fn(async () => undefined),
      execute: connectionExecute,
      commit: vi.fn(async () => undefined),
      rollback: vi.fn(async () => undefined),
      release: vi.fn(),
    };
    getConnectionMock.mockResolvedValueOnce(connection);

    const payload = {
      boxTypeName: "Boxfix",
      cardboardType: "B",
      cardboardColour: "Brown",
      boxPrint: "No print",
      sizeType: "Custom",
      transport: "Pallet",
      quantity: 500,
      message: "Test order",
      acceptedTerms: true,
      firstName: "Demo",
      surname: "User",
      companyName: "Boxmag SRL",
      email: "customer@example.com",
      phone: "+40700000000",
      address: "Str. Test 1",
      postcode: "010101",
      city: "Bucharest",
      country: "RO",
      accountEmail: "customer@example.com",
    };

    const response = await request(app).post("/api/orders").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.emailsSent).toEqual({
      notification: true,
      customerConfirmation: true,
    });
    expect(sendOrderCreationEmailsMock).toHaveBeenCalledTimes(1);
    expect(connectionExecute).toHaveBeenCalled();
    const insertArgs = connectionExecute.mock.calls[0]?.[1] as unknown[];
    expect(insertArgs?.[0]).toBe(7);
  });

  it("returns guest B2B order for authenticated user after account creation", async () => {
    const userEmail = "cypress.b2b@example.com";
    const token = createUserSessionToken(99, userEmail);
    if (!token) throw new Error("Failed to create user session token");

    queryMock.mockResolvedValueOnce([
      [
        {
          id: 128,
          box_type_name: "Standard Boxes",
          cardboard_type: "B Wave",
          cardboard_colour: "Brown On Both Side",
          box_print: "No Color",
          length_mm: 400,
          width_mm: 300,
          height_mm: 200,
          size_type: "Internal Size - mm",
          transport: "Own",
          quantity: 500,
          attachment_name: null,
          attachment_object_name: null,
          attachment_url: null,
          message: "Cypress B2B full flow test.",
          items_json: null,
          status: "new",
          payment_status: null,
          stripe_session_id: null,
          total_amount_cents: null,
          subtotal_cents: null,
          vat_percent: null,
          vat_cents: null,
          shipping_cents: null,
          shipping_method: null,
          shipping_eta: null,
          offer_sent_at: null,
          offer_sent_from: null,
          currency: null,
          created_at: "2026-07-15T09:00:00.000Z",
          first_name: "Ion",
          surname: "Popescu",
          company_name: "Boxmag Demo SRL",
          email: userEmail,
          phone: "+40799111222",
          city: "Bucuresti",
          country: "RO",
        },
      ],
    ]);

    const response = await request(app)
      .get("/api/orders")
      .query({ email: userEmail })
      .set("Cookie", `${USER_COOKIE_NAME}=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].orderNumber).toBe("ORD-0128");
    expect(response.body.data[0].email).toBe(userEmail);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("LOWER(c.email) = ?"),
      [userEmail, userEmail],
    );
  });

  it("returns 401 for order listing without admin auth or email filter", async () => {
    const response = await request(app).get("/api/orders");
    expect(response.status).toBe(401);
  });

  it("returns order detail for admin without email filter (INV-AUTH-EMAIL-SCOPE)", async () => {
    const adminCookie = await adminCookieHeader();
    queryMock.mockResolvedValueOnce([
      [
        {
          id: 12,
          box_type_name: "Standard Box",
          cardboard_type: "B Wave",
          cardboard_colour: "Brown",
          box_print: "No print",
          length_mm: 100,
          width_mm: 80,
          height_mm: 60,
          size_type: "internal",
          transport: "Own",
          quantity: 100,
          attachment_name: null,
          attachment_object_name: null,
          attachment_url: null,
          message: "hello",
          items_json: null,
          status: "new",
          payment_status: "pending",
          stripe_session_id: null,
          total_amount_cents: null,
          subtotal_cents: null,
          vat_percent: null,
          vat_cents: null,
          shipping_cents: null,
          shipping_method: null,
          shipping_eta: null,
          offer_sent_at: null,
          offer_sent_from: null,
          currency: null,
          created_at: "2026-07-01T00:00:00.000Z",
          first_name: "Ana",
          surname: "Ionescu",
          company_name: "Boxmag SRL",
          email: "ana@example.com",
          phone: "+40700000000",
          city: "Bucuresti",
          country: "RO",
        },
      ],
    ]);

    const response = await request(app)
      .get("/api/orders/12")
      .set("Cookie", adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.orderNumber).toBe("ORD-0012");
    expect(response.body.data.email).toBe("ana@example.com");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE o.id = ?"),
      [12],
    );
  });

  it("returns order detail scoped by matching user email (INV-AUTH-EMAIL-SCOPE)", async () => {
    const userEmail = "scoped@example.com";
    const token = createUserSessionToken(7, userEmail);
    queryMock.mockResolvedValueOnce([
      [
        {
          id: 44,
          box_type_name: "Custom",
          cardboard_type: "E Wave",
          cardboard_colour: "White",
          box_print: "1 color",
          length_mm: null,
          width_mm: null,
          height_mm: null,
          size_type: "external",
          transport: "Courier",
          quantity: 200,
          attachment_name: null,
          attachment_object_name: null,
          attachment_url: null,
          message: "",
          items_json: null,
          status: "in progress",
          payment_status: null,
          stripe_session_id: null,
          total_amount_cents: null,
          subtotal_cents: null,
          vat_percent: null,
          vat_cents: null,
          shipping_cents: null,
          shipping_method: null,
          shipping_eta: null,
          offer_sent_at: null,
          offer_sent_from: null,
          currency: null,
          created_at: "2026-07-02T00:00:00.000Z",
          first_name: "Ion",
          surname: "Pop",
          company_name: null,
          email: userEmail,
          phone: null,
          city: "Cluj",
          country: "RO",
        },
      ],
    ]);

    const response = await request(app)
      .get("/api/orders/44")
      .query({ email: userEmail })
      .set("Cookie", `${USER_COOKIE_NAME}=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(44);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("LOWER(c.email) = ?"),
      [44, userEmail, userEmail],
    );
  });

  it("returns 401 for order detail without admin or email scope", async () => {
    const response = await request(app).get("/api/orders/12");
    expect(response.status).toBe(401);
  });

  it("returns 404 when order detail is missing for admin", async () => {
    const adminCookie = await adminCookieHeader();
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .get("/api/orders/999")
      .set("Cookie", adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.message).toContain("Order not found");
  });

  it("returns 401 for attachment when email does not match session (INV-AUTH-EMAIL-SCOPE)", async () => {
    const response = await request(app)
      .get("/api/orders/12/attachment")
      .query({ email: "other@example.com" })
      .set("Cookie", `${USER_COOKIE_NAME}=${createUserSessionToken(7, "mine@example.com")}`);

    expect(response.status).toBe(401);
  });

  it("returns 401 for attachment without admin auth or email filter", async () => {
    const response = await request(app).get("/api/orders/12/attachment");
    expect(response.status).toBe(401);
  });

  it("lists all orders for an admin with no email filter", async () => {
    const adminCookie = await adminCookieHeader();
    queryMock.mockResolvedValueOnce([
      [
        {
          id: 5,
          box_type_name: "Standard Box",
          cardboard_type: "B Wave",
          cardboard_colour: "Brown",
          box_print: "No print",
          length_mm: null,
          width_mm: null,
          height_mm: null,
          size_type: "Custom",
          transport: "Own",
          quantity: 100,
          attachment_name: null,
          attachment_object_name: null,
          attachment_url: null,
          message: "",
          items_json: null,
          status: "new",
          payment_status: null,
          stripe_session_id: null,
          total_amount_cents: null,
          subtotal_cents: null,
          vat_percent: null,
          vat_cents: null,
          shipping_cents: null,
          shipping_method: null,
          shipping_eta: null,
          offer_sent_at: null,
          offer_sent_from: null,
          currency: null,
          created_at: "2026-07-01T00:00:00.000Z",
          first_name: "Ana",
          surname: "Ionescu",
          company_name: "Boxmag SRL",
          email: "admin-view@example.com",
          phone: "+40700000000",
          city: "Bucuresti",
          country: "RO",
        },
      ],
    ]);

    const response = await request(app)
      .get("/api/orders")
      .set("Cookie", adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("FROM orders o"));
  });

  it("returns configured offer senders for admin", async () => {
    const adminCookie = await adminCookieHeader();
    const response = await request(app)
      .get("/api/orders/offer-senders")
      .set("Cookie", adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual([
      { key: "orders", email: "orders@example.com", label: "Orders" },
    ]);
    expect(response.body.defaultKey).toBe("orders");
  });

  it("returns 401 for offer-senders without admin auth", async () => {
    const response = await request(app).get("/api/orders/offer-senders");
    expect(response.status).toBe(401);
  });

  it("returns 503 when sending an offer but email transport is not configured", async () => {
    const adminCookie = await adminCookieHeader();
    isOrderEmailTransportConfiguredMock.mockReturnValue(false);

    const response = await request(app)
      .post("/api/orders/12/send-offer")
      .set("Cookie", adminCookie)
      .send({ fromKey: "orders" });

    expect(response.status).toBe(503);
    expect(sendOrderOfferEmailToCustomerMock).not.toHaveBeenCalled();
  });

  it("sends an order offer email and records offer-sent metadata", async () => {
    const adminCookie = await adminCookieHeader();
    isOrderEmailTransportConfiguredMock.mockReturnValue(true);

    queryMock
      .mockResolvedValueOnce([
        [
          {
            id: 12,
            box_type_name: "Standard Box",
            cardboard_type: "B Wave",
            cardboard_colour: "Brown",
            box_print: "No print",
            length_mm: null,
            width_mm: null,
            height_mm: null,
            size_type: "Custom",
            transport: "Own",
            quantity: 100,
            attachment_name: null,
            attachment_object_name: null,
            attachment_url: null,
            message: "",
            items_json: null,
            status: "new",
            payment_status: null,
            total_amount_cents: null,
            subtotal_cents: null,
            vat_percent: null,
            vat_cents: null,
            shipping_cents: null,
            shipping_method: null,
            shipping_eta: null,
            offer_sent_at: null,
            offer_sent_from: null,
            currency: null,
            created_at: "2026-07-01T00:00:00.000Z",
            first_name: "Ana",
            surname: "Ionescu",
            company_name: "Boxmag SRL",
            email: "offer-target@example.com",
            phone: "+40700000000",
            city: "Bucuresti",
            country: "RO",
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            offer_sent_at: "2026-07-19T10:00:00.000Z",
            offer_sent_from: "orders@example.com",
          },
        ],
      ]);
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .post("/api/orders/12/send-offer")
      .set("Cookie", adminCookie)
      .send({ fromKey: "orders", message: "Here is your offer" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.to).toBe("offer-target@example.com");
    expect(response.body.data.offerSentFrom).toBe("orders@example.com");
    expect(sendOrderOfferEmailToCustomerMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when sending an offer for a missing order", async () => {
    const adminCookie = await adminCookieHeader();
    isOrderEmailTransportConfiguredMock.mockReturnValue(true);
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .post("/api/orders/999/send-offer")
      .set("Cookie", adminCookie)
      .send({ fromKey: "orders" });

    expect(response.status).toBe(404);
  });

  it("updates payment status for an admin on a non-Stripe order", async () => {
    const adminCookie = await adminCookieHeader();
    queryMock.mockResolvedValueOnce([[{ stripe_session_id: null }]]);
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .patch("/api/orders/12/payment-status")
      .set("Cookie", adminCookie)
      .send({ paymentStatus: "paid" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 12, paymentStatus: "paid" });
  });

  it("blocks manual payment-status update for Stripe-managed orders", async () => {
    const adminCookie = await adminCookieHeader();
    queryMock.mockResolvedValueOnce([[{ stripe_session_id: "cs_test_123" }]]);

    const response = await request(app)
      .patch("/api/orders/12/payment-status")
      .set("Cookie", adminCookie)
      .send({ paymentStatus: "paid" });

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns 404 when updating payment status for a missing order", async () => {
    const adminCookie = await adminCookieHeader();
    queryMock.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .patch("/api/orders/999/payment-status")
      .set("Cookie", adminCookie)
      .send({ paymentStatus: "paid" });

    expect(response.status).toBe(404);
  });

  it("updates order status for an admin on the happy path", async () => {
    const adminCookie = await adminCookieHeader();
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .patch("/api/orders/12/status")
      .set("Cookie", adminCookie)
      .send({ status: "completed" });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({ id: 12, status: "completed" });
  });

  it("returns 404 when updating status for a missing order", async () => {
    const adminCookie = await adminCookieHeader();
    executeMock.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .patch("/api/orders/999/status")
      .set("Cookie", adminCookie)
      .send({ status: "completed" });

    expect(response.status).toBe(404);
  });
});
