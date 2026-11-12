import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminCookie, ensureTestAuthEnv } from "./test-helpers";

const { queryMock, executeMock, uploadMock, getAttachmentMock } = vi.hoisted(
  () => ({
    queryMock: vi.fn(),
    executeMock: vi.fn(),
    uploadMock: vi.fn(async () => ({ objectName: "orders/attachments/x" })),
    getAttachmentMock: vi.fn(),
  }),
);

vi.mock("../db/mysql", () => ({
  mysqlPool: {
    query: queryMock,
    execute: executeMock,
    getConnection: vi.fn(async () => {
      throw new Error("no db in this test");
    }),
  },
}));

vi.mock("../services/minio", () => ({
  uploadOrderAttachmentToMinio: uploadMock,
  getOrderAttachmentFromMinio: getAttachmentMock,
  parseOrderAttachmentObjectNameFromUrl: vi.fn(() => null),
}));

vi.mock("../services/email", () => ({
  isEmailTransportConfigured: vi.fn(() => true),
  isOrderEmailTransportConfigured: vi.fn(() => true),
  getOrderOfferSenderOptions: vi.fn(() => []),
  resolveDefaultOrderOfferFromKey: vi.fn(() => "info"),
  sendContactReplyEmail: vi.fn(),
  sendOrderCreationEmails: vi.fn(),
  sendOrderOfferEmailToCustomer: vi.fn(),
}));

import { app } from "../app";
import {
  isAllowedOrderAttachmentName,
  resolveOrderAttachmentServing,
} from "../config/uploads";

function validOrderPayload() {
  return {
    boxTypeName: "Standard Box",
    cardboardType: "3 straturi",
    cardboardColour: "Maro",
    boxPrint: "Fara print",
    sizeType: "Standard",
    transport: "Curier",
    quantity: 100,
    message: "Test order",
    acceptedTerms: true,
    firstName: "Ion",
    surname: "Popescu",
    companyName: "Test SRL",
    email: "customer@example.com",
    phone: "0700000000",
    address: "Str. Test 1",
    postcode: "010101",
    city: "Bucuresti",
    country: "Romania",
  };
}

async function attachmentResponseFor(fileName: string, storedType: string) {
  queryMock.mockResolvedValueOnce([
    [
      {
        id: 12,
        attachment_name: fileName,
        attachment_object_name: `orders/attachments/${fileName}`,
        attachment_url: null,
      },
    ],
  ]);
  getAttachmentMock.mockResolvedValueOnce({
    buffer: Buffer.from("<script>alert(1)</script>"),
    contentType: storedType,
    size: 25,
  });
  return request(app)
    .get("/api/orders/12/attachment")
    .set("Cookie", adminCookie());
}

describe("order attachment hardening", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([[]]);
    executeMock.mockReset();
    uploadMock.mockClear();
    getAttachmentMock.mockReset();
    ensureTestAuthEnv();
  });

  it("allowlists attachment types by extension", () => {
    expect(isAllowedOrderAttachmentName("design.PDF")).toBe(true);
    expect(isAllowedOrderAttachmentName("logo.ai")).toBe(true);
    expect(isAllowedOrderAttachmentName("evil.html")).toBe(false);
    expect(isAllowedOrderAttachmentName("evil.svg")).toBe(false);
    expect(isAllowedOrderAttachmentName("evil.pdf.html")).toBe(false);
    expect(isAllowedOrderAttachmentName("noextension")).toBe(false);
    expect(isAllowedOrderAttachmentName("constructor")).toBe(false);
    expect(resolveOrderAttachmentServing("evil.html")).toEqual({
      contentType: "application/octet-stream",
      allowInline: false,
    });
  });

  it("rejects an HTML attachment on B2B order creation", async () => {
    const response = await request(app)
      .post("/api/orders")
      .send({
        ...validOrderPayload(),
        attachmentName: "evil.html",
        attachmentBase64: Buffer.from("<script>alert(1)</script>").toString(
          "base64",
        ),
        attachmentMimeType: "text/html",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("file type is not allowed");
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("serves a legacy HTML attachment as an opaque download, never inline", async () => {
    const response = await attachmentResponseFor("evil.html", "text/html");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/octet-stream");
    expect(response.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toContain("sandbox");
  });

  it("ignores a stored text/html type on an allowed extension", async () => {
    const response = await attachmentResponseFor("photo.png", "text/html");

    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["content-disposition"]).toMatch(/^inline;/);
    expect(response.headers["content-security-policy"]).toContain("sandbox");
  });

  it("still lets PDFs open inline and honours ?download=1", async () => {
    const inline = await attachmentResponseFor("specs.pdf", "application/pdf");
    expect(inline.headers["content-type"]).toBe("application/pdf");
    expect(inline.headers["content-disposition"]).toMatch(/^inline;/);

    queryMock.mockResolvedValueOnce([
      [
        {
          id: 12,
          attachment_name: "specs.pdf",
          attachment_object_name: "orders/attachments/specs.pdf",
          attachment_url: null,
        },
      ],
    ]);
    getAttachmentMock.mockResolvedValueOnce({
      buffer: Buffer.from("%PDF"),
      contentType: "application/pdf",
      size: 4,
    });
    const download = await request(app)
      .get("/api/orders/12/attachment")
      .query({ download: "1" })
      .set("Cookie", adminCookie());
    expect(download.headers["content-disposition"]).toMatch(/^attachment;/);
  });
});

describe("public write rate limits", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([[]]);
    executeMock.mockReset();
    executeMock.mockResolvedValue([{ insertId: 1 }]);
    ensureTestAuthEnv();
  });

  it("limits POST /api/orders per client IP", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(app)
        .post("/api/orders")
        .set("X-Forwarded-For", "203.0.113.50")
        .send({ boxTypeName: "incomplete" });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 400)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("does not rate-limit other order routes with the create budget", async () => {
    const response = await request(app)
      .get("/api/orders")
      .set("X-Forwarded-For", "203.0.113.50")
      .set("Cookie", adminCookie());
    expect(response.status).not.toBe(429);
  });

  const contactBody = {
    firstName: "Ana",
    surname: "Pop",
    email: "ana@example.com",
    message: "Need boxes",
  };

  it("limits anonymous POST /api/contact per IP", async () => {
    let last = 0;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      const response = await request(app)
        .post("/api/contact")
        .set("X-Forwarded-For", "203.0.113.60")
        .send(contactBody);
      last = response.status;
    }
    expect(last).toBe(429);
  });

  it("exempts the frontend server (admin credential) from the contact limit", async () => {
    let last = 0;
    for (let attempt = 0; attempt < 35; attempt += 1) {
      const response = await request(app)
        .post("/api/contact")
        .set("X-Forwarded-For", "203.0.113.61")
        .set("Cookie", adminCookie())
        .send(contactBody);
      last = response.status;
    }
    expect(last).toBe(201);
  });

  it("does not count admin inbox reads against the contact limit", async () => {
    let last = 0;
    for (let attempt = 0; attempt < 35; attempt += 1) {
      const response = await request(app)
        .get("/api/contact")
        .set("X-Forwarded-For", "203.0.113.62")
        .set("Cookie", adminCookie());
      last = response.status;
    }
    expect(last).toBe(200);
  });
});
