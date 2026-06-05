import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, executeMock, getConnectionMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  executeMock: vi.fn(),
  getConnectionMock: vi.fn(),
}));

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
    getConnection: getConnectionMock,
  },
}));

vi.mock("../services/email", () => ({
  isOrderEmailTransportConfigured: vi.fn(() => false),
  sendBusinessOrderConfirmationEmailToCustomer: vi.fn(async () => undefined),
  sendNewOrderNotificationEmail: vi.fn(async () => undefined),
}));

vi.mock("../services/minio", () => ({
  uploadOrderAttachmentToMinio: vi.fn(async () => ({
    objectName: "orders/attachments/test.pdf",
    url: "http://localhost:9000/bucket/orders/attachments/test.pdf",
  })),
  getOrderAttachmentFromMinio: vi.fn(async () => ({
    buffer: Buffer.from("sample attachment"),
    contentType: "application/pdf",
    size: 17,
  })),
}));

import { app } from "../app";

describe("orders routes", () => {
  beforeEach(() => {
    queryMock.mockReset();
    executeMock.mockReset();
  });

  it("returns 400 for invalid status transition payload", async () => {
    const response = await request(app)
      .patch("/api/orders/12/status")
      .send({ status: "unknown-status" });

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
      .query({ email: "customer@example.com" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain("specs.pdf");
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
    expect(connectionExecute).toHaveBeenCalled();
    const insertArgs = connectionExecute.mock.calls[0]?.[1] as unknown[];
    expect(insertArgs?.[0]).toBe(7);
  });
});
